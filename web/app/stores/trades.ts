import { defineStore } from 'pinia'
import { CACHE_TTL_SHORT } from '~/constants/cache'
import type { DomainTrade, TradePlayer, RealRarity } from '~/types/domain'
import type { TradeEligibility, UUID } from '~/types/api'
import type { Generation } from '~/constants/generation'
import { tradesRepo } from '~/repositories'
import { dedupe } from '~/utils/dedupe'

const TTL = CACHE_TTL_SHORT
// Le seuil d'éligibilité n'est PAS une constante : il vaut 120 à Kanto et 80 à
// Johto, et c'est l'API qui le renvoie (`minRequired`). Il était codé en dur
// ici, ce qui donnait un chiffre faux dès qu'on jouait Johto.
const CLOSED: DomainTrade['status'][] = ['completed', 'declined', 'cancelled', 'expired']

export const useTradesStore = defineStore('trades', {
  state: () => ({
    trades: [] as DomainTrade[],
    eligibility: null as TradeEligibility | null,
    players: [] as TradePlayer[],
    fetchedAt: 0,
    // Génération pour laquelle les données en cache ont été chargées : changer
    // de région doit tout réinvalider, jamais mélanger deux listes.
    loadedFor: null as Generation | null,
    playersFetched: false
  }),

  getters: {
    // Échanges qui attendent MON action.
    toHandle(state): DomainTrade[] {
      const me = useAuthStore().userId
      return state.trades.filter(t =>
        (t.status === 'pending_target' && t.targetId === me)
        || (t.status === 'pending_initiator' && t.initiatorId === me))
    },
    // Échanges en attente de l'AUTRE joueur.
    waiting(state): DomainTrade[] {
      const me = useAuthStore().userId
      return state.trades.filter(t =>
        (t.status === 'pending_target' && t.initiatorId === me)
        || (t.status === 'pending_initiator' && t.targetId === me))
    },
    history: state => state.trades.filter(t => CLOSED.includes(t.status))
  },

  actions: {
    async ensureFresh(force = false) {
      const gen = useWalletStore().activeGeneration
      const stale = this.loadedFor !== gen
      if (!force && !stale && this.fetchedAt && Date.now() - this.fetchedAt < TTL) return
      if (stale) {
        this.players = []
        this.playersFetched = false
      }
      const [trades, elig] = await Promise.all([
        dedupe('trades', () => tradesRepo.list(useApi())),
        dedupe(`trades/eligibility/${gen}`, () => tradesRepo.eligibility(useApi(), gen))
      ])
      this.trades = trades
      this.eligibility = elig
      this.loadedFor = gen
      this.fetchedAt = Date.now()
    },

    async loadPlayers() {
      const gen = useWalletStore().activeGeneration
      try {
        this.players = await dedupe(`trades/players/${gen}`, () => tradesRepo.players(useApi(), gen))
      } catch {
        this.players = []
      } finally {
        this.playersFetched = true
      }
    },

    playerCards(playerId: UUID, rarity: RealRarity) {
      return tradesRepo.playerCards(useApi(), playerId, rarity, useWalletStore().activeGeneration)
    },

    async create(targetId: UUID, requestedCardId: UUID) {
      await tradesRepo.create(useApi(), targetId, requestedCardId)
      await this.ensureFresh(true)
    },
    async respond(id: UUID, accept: boolean, offeredCardId?: UUID) {
      await tradesRepo.respond(useApi(), id, accept, offeredCardId)
      await this.ensureFresh(true)
    },
    async confirm(id: UUID, accept: boolean) {
      await tradesRepo.confirm(useApi(), id, accept)
      await this.ensureFresh(true)
    },
    async cancel(id: UUID) {
      await tradesRepo.cancel(useApi(), id)
      await this.ensureFresh(true)
    }
  }
})
