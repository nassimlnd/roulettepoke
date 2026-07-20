import { defineStore } from 'pinia'
import type { DomainOwnedCard } from '~/types/domain'
import type { UUID } from '~/types/api'
import { collectionRepo, mergeRepo } from '~/repositories'
import { dedupe } from '~/utils/dedupe'

const TTL = 5 * 60_000
const FUSION_THRESHOLD = 10

export const useCollectionStore = defineStore('collection', {
  state: () => ({
    cards: [] as DomainOwnedCard[],
    fetchedAt: 0
  }),

  getters: {
    owned: state => state.cards.filter(c => c.owned),
    standard: state => state.cards.filter(c => !c.isShiny),
    shiny: state => state.cards.filter(c => c.isShiny),
    ownedStandardCount: state => state.cards.filter(c => c.owned && !c.isShiny).length,
    ownedShinyCount: state => state.cards.filter(c => c.owned && c.isShiny).length,
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
      const cards = await dedupe('collection/all', () => collectionRepo.all(useApi()))
      this.cards = cards
      this.fetchedAt = Date.now()
    },

    invalidate() {
      this.fetchedAt = 0
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
