import { defineStore } from 'pinia'
import { CACHE_TTL_SHORT, CACHE_TTL_LONG } from '~/constants/cache'
import type {
  TrainingStatus, SlotStatus, SpinStatus,
  TradeEligibility, NotificationsResponse
} from '~/types/api'
import type { DomainGym, DomainTournament, DomainTrade, DomainLeagueStatus } from '~/types/domain'
import {
  trainingRepo, slotRepo, leagueRepo, tournamentRepo, spinRepo,
  tradesRepo, gymRepo, notificationsRepo
} from '~/repositories'
import { dedupe } from '~/utils/dedupe'
import { nextDailyReset, nextWeekly } from '~/utils/paris-time'

const TTL_SHORT = CACHE_TTL_SHORT
const TTL_LONG = CACHE_TTL_LONG

export interface QuotaTile {
  key: string
  label: string
  available: boolean
  nextResetAt: Date | null
  to: string
}

export const useHubStore = defineStore('hub', {
  state: () => ({
    training: null as TrainingStatus | null,
    slot: null as SlotStatus | null,
    league: null as DomainLeagueStatus | null,
    tournament: null as DomainTournament | null,
    spin: null as SpinStatus | null,
    trades: [] as DomainTrade[],
    tradeEligibility: null as TradeEligibility | null,
    gyms: [] as DomainGym[],
    notifications: null as NotificationsResponse | null,
    shortFetchedAt: 0,
    longFetchedAt: 0
  }),

  getters: {
    // Badges navbar (résout C4 : lus depuis le store, aucun fetch par navigation).
    tradeActionsRequired(state): number {
      const myId = useAuthStore().userId
      return state.trades.filter(t =>
        (t.status === 'pending_target' && t.targetId === myId)
        || (t.status === 'pending_initiator' && t.initiatorId === myId)
      ).length
    },
    unreadNotifications: state => state.notifications?.unreadCount ?? 0,
    leagueUnlocked: state => !!state.league?.cycleStart || !!state.league?.eligible,
    currentGym: state => state.gyms.find(g => !g.hasBadge) ?? null,

    // Tuiles « Aujourd'hui »
    dailyTiles(state): QuotaTile[] {
      const daily = nextDailyReset()
      return [
        {
          key: 'training',
          label: 'Entraînement',
          available: !!state.training?.canFightToday,
          nextResetAt: daily,
          to: '/gyms'
        },
        {
          key: 'jackpot',
          label: 'Jackpot',
          available: !!state.slot?.canSpin,
          nextResetAt: daily,
          to: '/slot-machine'
        }
      ]
    },

    // Tuiles « Cette semaine »
    weeklyTiles(state): QuotaTile[] {
      const monday = nextWeekly(1, 0)
      const thursday = nextWeekly(4, 12)
      const gym = state.gyms.find(g => !g.hasBadge)
      const tiles: QuotaTile[] = [
        {
          key: 'gym',
          label: gym ? gym.name : 'Arènes',
          available: !!gym?.canAttempt,
          nextResetAt: monday,
          to: '/gyms'
        },
        {
          key: 'tournament',
          label: 'Tournoi',
          available: state.tournament?.status === 'registration_open' && !state.tournament?.isRegistered,
          nextResetAt: thursday,
          to: '/tournament'
        }
      ]
      if (this.leagueUnlocked) {
        tiles.push({
          key: 'league',
          label: 'Ligue des 4',
          available: !!state.league?.eligible && !state.league?.alreadyAttempted,
          nextResetAt: thursday,
          to: '/league'
        })
      }
      tiles.push({
        key: 'trade',
        label: 'Échange',
        available: !!state.tradeEligibility?.eligible,
        nextResetAt: monday,
        to: '/trades'
      })
      if (state.spin?.hasStarters) {
        tiles.push({
          key: 'spin',
          label: 'Spin',
          available: !state.spin?.rewardedThisWeek,
          nextResetAt: monday,
          to: '/spin'
        })
      }
      return tiles
    }
  },

  actions: {
    // Données « fraîches » de la navbar (TTL court) — montées une fois au layout.
    async ensureShort(force = false) {
      if (!force && this.shortFetchedAt && Date.now() - this.shortFetchedAt < TTL_SHORT) return
      const api = useApi()
      const [trades, tournament, league, notifications] = await Promise.all([
        dedupe('trades', () => tradesRepo.list(api)).catch(() => [] as DomainTrade[]),
        dedupe('tournament/current', () => tournamentRepo.current(api)).catch(() => null),
        dedupe('league/status', () => leagueRepo.status(api)).catch(() => null),
        dedupe('notifications', () => notificationsRepo.list(api)).catch(() => null)
      ])
      this.trades = trades
      this.tournament = tournament
      this.league = league
      this.notifications = notifications
      this.shortFetchedAt = Date.now()
    },

    // Statuts de quotas (TTL plus long) — pour le hub.
    async ensureLong(force = false) {
      if (!force && this.longFetchedAt && Date.now() - this.longFetchedAt < TTL_LONG) return
      const api = useApi()
      const [training, slot, spin, gyms, eligibility] = await Promise.all([
        dedupe('training/status', () => trainingRepo.status(api)).catch(() => null),
        dedupe('slot/status', () => slotRepo.status(api)).catch(() => null),
        dedupe('spin/status', () => spinRepo.status(api)).catch(() => null),
        dedupe('gym', () => gymRepo.getAll(api)).catch(() => [] as DomainGym[]),
        dedupe('trades/eligibility', () => tradesRepo.eligibility(api)).catch(() => null)
      ])
      this.training = training
      this.slot = slot
      this.spin = spin
      this.gyms = gyms
      this.tradeEligibility = eligibility
      this.longFetchedAt = Date.now()
    },

    async markNotificationsRead() {
      if (!this.unreadNotifications) return
      try {
        await notificationsRepo.readAll(useApi())
        if (this.notifications) this.notifications.unreadCount = 0
      } catch { /* silencieux */ }
    }
  }
})
