import { defineStore } from 'pinia'
import { CACHE_TTL_LONG } from '~/constants/cache'
import type { DomainOwnedCard, ZarbiForm } from '~/types/domain'
import type { SellResult, UUID } from '~/types/api'
import type { SellPlanLine } from '~/utils/sellPlan'
import { hasEvolution } from '~/utils/sellPlan'
import { collectionRepo, mergeRepo } from '~/repositories'
import { dedupe } from '~/utils/dedupe'
import { asGeneration } from '~/constants/generation'

const TTL = CACHE_TTL_LONG
const FUSION_THRESHOLD = 10
// Une forme de Zarbi se revend 1 🪙, quelle que soit sa variante.
export const ZARBI_SELL_PRICE = 1
// Le Zarbi « ? » shiny n'est pas vendable côté serveur : le proposer mènerait
// à une erreur, autant ne pas afficher le bouton.
export function zarbiSellable(f: ZarbiForm): boolean {
  return f.owned && !(f.form === '?' && f.isShiny)
}

export const useCollectionStore = defineStore('collection', {
  state: () => ({
    cards: [] as DomainOwnedCard[],
    fetchedAt: 0,
    zarbi: [] as ZarbiForm[],
    zarbiFetchedAt: 0
  }),

  getters: {
    owned: state => state.cards.filter(c => c.owned),
    standard: state => state.cards.filter(c => !c.isShiny),
    shiny: state => state.cards.filter(c => c.isShiny),
    ownedStandardCount: state => state.cards.filter(c => c.owned && !c.isShiny).length,
    ownedShinyCount: state => state.cards.filter(c => c.owned && c.isShiny).length,
    // ─── Zarbi ────────────────────────────────────────────────────────────
    // Une seule carte du dex, 28 formes cosmétiques, chacune en standard et en
    // shiny. Le dex shiny ne se débloque qu'une fois le dex standard complet —
    // règle du jeu, pas une décision d'affichage.
    zarbiStandard: state => state.zarbi.filter(f => !f.isShiny),
    zarbiShiny: state => state.zarbi.filter(f => f.isShiny),
    zarbiOwnedStandard(): number { return this.zarbiStandard.filter(f => f.owned).length },
    zarbiOwnedShiny(): number { return this.zarbiShiny.filter(f => f.owned).length },
    zarbiShinyUnlocked(): boolean {
      return this.zarbiStandard.length > 0
        && this.zarbiOwnedStandard >= this.zarbiStandard.length
    },

    // Cartes fusionnables : ≥ 10 exemplaires et une évolution existe dans le
    // catalogue (critère partagé avec la vente intelligente, qui protège la
    // réserve de fusion des mêmes cartes).
    mergeables(state): DomainOwnedCard[] {
      return state.cards.filter(c =>
        c.owned && c.quantity >= FUSION_THRESHOLD && hasEvolution(c, state.cards))
    }
  },

  actions: {
    async ensureFresh(force = false) {
      if (!force && this.cards.length && Date.now() - this.fetchedAt < TTL) return
      // /collection renvoie le dex complet AVEC la possession de l'utilisateur
      // (owned + quantity). /collection/all renvoie le catalogue sans possession
      // (owned toujours false), inutilisable pour la vue joueur.
      const cards = await dedupe('collection/mine', () => collectionRepo.mine(useApi()))
      this.cards = cards
      this.fetchedAt = Date.now()
    },

    invalidate() {
      this.fetchedAt = 0
      this.zarbiFetchedAt = 0
    },

    async ensureZarbi(force = false) {
      if (!force && this.zarbi.length && Date.now() - this.zarbiFetchedAt < TTL) return
      this.zarbi = await dedupe('collection/zarbi', () => collectionRepo.zarbiForms(useApi()))
      this.zarbiFetchedAt = Date.now()
    },

    // Toute vente réconcilie le portefeuille depuis SA réponse : le solde reçu
    // est celui de la bourse de la génération de la carte (voir
    // reconcileGeneration). Réponse sans solde (shiny → charme) : on resynchronise
    // via /auth/me, qui porte les deux bourses.
    async syncWalletAfterSale(res: SellResult, source: string) {
      const wallet = useWalletStore()
      if (typeof res.newCoins === 'number' && res.generation) {
        wallet.reconcileGeneration(asGeneration(res.generation), res.newCoins, source)
      } else {
        await wallet.refreshFromServer(source)
      }
    },

    async sellZarbi(formId: UUID) {
      const res = await collectionRepo.sellZarbi(useApi(), formId)
      await this.syncWalletAfterSale(res, 'sell-zarbi')
      await this.ensureZarbi(true)
      return res
    },

    // Chance shiny estimée (fallback frontend, règle du Guide : +1/500 par
    // exemplaire possédé). Étiquetée « estimation » côté UI.
    estimatedShinyChance(card: DomainOwnedCard): number {
      return (card.quantity + 1) / 500
    },

    async sell(cardId: UUID) {
      const res = await collectionRepo.sell(useApi(), cardId)
      await this.syncWalletAfterSale(res, 'sell')
      this.invalidate()
      return res
    },

    // Vente en lot : l'API ne vend qu'UN exemplaire par appel (~1 s mesurée),
    // donc un plan de N exemplaires = N appels séquentiels. `onProgress` nourrit
    // la barre de progression, `shouldStop` est relu avant chaque appel (bouton
    // Stop / fermeture de la modale) — on n'interrompt jamais un appel en vol.
    async sellBulk(
      lines: SellPlanLine[],
      onProgress: (done: number, total: number, name: string, coins: number, charms: number) => void,
      shouldStop: () => boolean
    ) {
      const api = useApi()
      const total = lines.reduce((n, l) => n + l.count, 0)
      let done = 0
      let coins = 0
      let charms = 0
      let failed: string | null = null
      let stopped = false

      for (const line of lines) {
        if (stopped || failed) break
        for (let i = 0; i < line.count; i++) {
          if (shouldStop()) {
            stopped = true
            break
          }
          let res: SellResult
          try {
            res = await collectionRepo.sell(api, line.card.id)
          } catch {
            // Une seule relance : un raté isolé (réseau) ne doit pas jeter le
            // lot, mais un serveur qui refuse ne mérite pas l'acharnement.
            await new Promise(r => setTimeout(r, 900))
            try {
              res = await collectionRepo.sell(api, line.card.id)
            } catch {
              failed = line.card.name
              break
            }
          }
          coins += res.sellPrice ?? 0
          if (res.charmeObtained) charms++
          // Le solde de la navbar suit la vente en direct.
          if (typeof res.newCoins === 'number' && res.generation) {
            useWalletStore().reconcileGeneration(asGeneration(res.generation), res.newCoins, 'smart-sell')
          }
          done++
          onProgress(done, total, line.card.name, coins, charms)
        }
      }

      // Quoi qu'il soit arrivé (fin, stop, échec), l'état affiché repart du
      // serveur : grille et portefeuille. Ces rafraîchissements sont du confort :
      // leur échec (réseau qui flanche APRÈS les ventes) ne doit pas engloutir
      // le bilan d'un lot déjà exécuté — invalidate() garantit de toute façon
      // que la prochaine visite repartira du serveur.
      this.invalidate()
      await this.ensureFresh(true).catch(() => {})
      await useWalletStore().refreshFromServer('smart-sell')
      return { done, total, coins, charms, failed, stopped }
    },

    async merge(parentCardId: UUID, currentLevel: number) {
      const card = await mergeRepo.perform(useApi(), parentCardId, currentLevel)
      this.invalidate()
      await this.ensureFresh(true)
      return card
    }
  }
})
