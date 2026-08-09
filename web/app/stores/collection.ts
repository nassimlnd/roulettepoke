import { defineStore } from 'pinia'
import { CACHE_TTL_LONG } from '~/constants/cache'
import type { DomainOwnedCard, ZarbiForm } from '~/types/domain'
import type { UUID } from '~/types/api'
import { collectionRepo, mergeRepo } from '~/repositories'
import { dedupe } from '~/utils/dedupe'

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

    // Cartes fusionnables : ≥ 10 exemplaires et une évolution existe dans le catalogue.
    mergeables(state): DomainOwnedCard[] {
      return state.cards.filter((c) => {
        if (!c.owned || c.quantity < FUSION_THRESHOLD || c.level >= 3) return false
        const parent = c.parentCardId ?? c.id
        return state.cards.some(x => x.parentCardId === parent && x.level === c.level + 1)
      })
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

    async sellZarbi(formId: UUID) {
      const res = await collectionRepo.sellZarbi(useApi(), formId)
      useWalletStore().reconcile(res.newCoins, 'sell-zarbi')
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
      useWalletStore().reconcile(res.newCoins, 'sell')
      this.invalidate()
      return res
    },

    async merge(parentCardId: UUID, currentLevel: number) {
      const card = await mergeRepo.perform(useApi(), parentCardId, currentLevel)
      this.invalidate()
      await this.ensureFresh(true)
      return card
    }
  }
})
