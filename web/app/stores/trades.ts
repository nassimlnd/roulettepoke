import { defineStore } from 'pinia'
import type { DomainTrade, TradePlayer, RealRarity } from '~/types/domain'
import type { TradeEligibility, UUID } from '~/types/api'
import { tradesRepo } from '~/repositories'
import { dedupe } from '~/utils/dedupe'

const TTL = 60_000
export const TRADE_MIN_CARDS = 120
const CLOSED: DomainTrade['status'][] = ['completed', 'declined', 'cancelled', 'expired']

export const useTradesStore = defineStore('trades', {
  state: () => ({
    trades: [] as DomainTrade[],
    eligibility: null as TradeEligibility | null,
    players: [] as TradePlayer[],
    fetchedAt: 0,
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
      if (!force && this.fetchedAt && Date.now() - this.fetchedAt < TTL) return
      const [trades, elig] = await Promise.all([
        dedupe('trades', () => tradesRepo.list(useApi())),
        dedupe('trades/eligibility', () => tradesRepo.eligibility(useApi()))
      ])
      this.trades = trades
      this.eligibility = elig
      this.fetchedAt = Date.now()
    },

    async loadPlayers() {
      try {
        this.players = await dedupe('trades/players', () => tradesRepo.players(useApi()))
      } catch {
        this.players = []
      } finally {
        this.playersFetched = true
      }
    },

    playerCards(playerId: UUID, rarity: RealRarity) {
      return tradesRepo.playerCards(useApi(), playerId, rarity)
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
