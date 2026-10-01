import { defineStore } from 'pinia'
import { CACHE_TTL_SHORT, CACHE_TTL_LONG } from '~/constants/cache'
import type {
  TrainingStatus, SlotStatus, SpinStatus,
  TradeEligibility, NotificationsResponse, MotusToday, WireActivity
} from '~/types/api'
import type { DomainGym, DomainTournament, DomainTrade, DomainLeagueStatus, DomainContest } from '~/types/domain'
import {
  trainingRepo, slotRepo, leagueRepo, tournamentRepo, spinRepo,
  tradesRepo, gymRepo, notificationsRepo, motusRepo, activitiesRepo, contestRepo
} from '~/repositories'
import { dedupe } from '~/utils/dedupe'
import { nextDailyReset, nextWeekly } from '~/utils/paris-time'
import { hashToRoute } from '~/utils/links'

// Nos tuiles ↔ les clés des « Activités du jour » du serveur. Quand le serveur
// connaît l'activité, SON état `done` fait foi : il voit des choses que nos
// statuts ne voient pas (ex. une tentative d'arène déjà jouée cette semaine).
const ACTIVITY_KEYS: Record<string, string> = {
  training: 'training',
  jackpot: 'jackpot',
  motus: 'motus',
  gym: 'gym',
  tournament: 'tournament',
  league: 'league',
  trade: 'trade',
  spin: 'spin_reward'
}

const TTL_SHORT = CACHE_TTL_SHORT
const TTL_LONG = CACHE_TTL_LONG

export interface QuotaTile {
  key: string
  label: string
  available: boolean
  nextResetAt: Date | null
  to: string
  // Ce que le rendez-vous rapporte. Le tableau annonçait des échéances sans
  // jamais dire l'enjeu : « Disponible » n'incite à rien si on ignore le gain.
  reward: string
}

export const useHubStore = defineStore('hub', {
  state: () => ({
    training: null as TrainingStatus | null,
    slot: null as SlotStatus | null,
    league: null as DomainLeagueStatus | null,
    tournament: null as DomainTournament | null,
    contest: null as DomainContest | null,
    spin: null as SpinStatus | null,
    trades: [] as DomainTrade[],
    tradeEligibility: null as TradeEligibility | null,
    gyms: [] as DomainGym[],
    motus: null as MotusToday | null,
    notifications: null as NotificationsResponse | null,
    activities: [] as WireActivity[],
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
    // Inscriptions au concours ouvertes et pas encore inscrit·e : pastille.
    contestOpen: state => state.contest?.status === 'registration_open' && !state.contest.isRegistered,
    leagueUnlocked: state => !!state.league?.cycleStart || !!state.league?.eligible,
    currentGym: state => state.gyms.find(g => !g.hasBadge) ?? null,

    // État `done` d'une activité selon le serveur ; undefined s'il ne la liste
    // pas (pas disponible aujourd'hui, ou API antérieure à la 4.2).
    serverDone(state) {
      return (tileKey: string): boolean | undefined =>
        state.activities.find(a => a.key === (ACTIVITY_KEYS[tileKey] ?? tileKey))?.done
    },

    // Tuiles « Aujourd'hui »
    dailyTiles(state): QuotaTile[] {
      const daily = nextDailyReset()
      const open = (key: string, fallback: boolean) => {
        const done = this.serverDone(key)
        return done === undefined ? fallback : !done
      }
      return [
        {
          key: 'training',
          label: 'Entraînement',
          available: open('training', !!state.training?.canFightToday),
          nextResetAt: daily,
          to: '/gyms',
          reward: '+5 🪙 · +2 % de bonus d\'arène'
        },
        {
          key: 'jackpot',
          label: 'Jackpot',
          available: open('jackpot', !!state.slot?.canSpin),
          nextResetAt: daily,
          to: '/slot-machine',
          reward: 'Pièces, tickets, Charme ou légendaire'
        },
        {
          key: 'motus',
          label: 'Motus — mot du jour',
          available: open('motus', state.motus?.status === 'in_progress'),
          nextResetAt: daily,
          to: '/motus',
          reward: 'Une forme de Zarbi · +10 🪙 au 1ᵉʳ'
        }
      ]
    },

    // Tuiles « Cette semaine »
    weeklyTiles(state): QuotaTile[] {
      const monday = nextWeekly(1, 0)
      const thursday = nextWeekly(4, 12)
      const gym = state.gyms.find(g => !g.hasBadge)
      const open = (key: string, fallback: boolean) => {
        const done = this.serverDone(key)
        return done === undefined ? fallback : !done
      }
      const tiles: QuotaTile[] = [
        {
          key: 'gym',
          label: gym ? gym.name : 'Arènes',
          available: open('gym', !!gym?.canAttempt),
          nextResetAt: monday,
          to: '/gyms',
          // `badgeName` contient déjà le mot « Badge » (ex. « Badge Roche ») :
          // le préfixer produisait « Badge Badge Roche ».
          reward: gym?.badgeName ?? 'Badge d\'arène'
        },
        {
          key: 'tournament',
          label: 'Tournoi',
          available: open('tournament', state.tournament?.status === 'registration_open' && !state.tournament?.isRegistered),
          nextResetAt: thursday,
          to: '/tournament',
          reward: state.tournament?.prizePool
            ? `Part d'une cagnotte de ${state.tournament.prizePool} 🪙`
            : 'Part de la cagnotte'
        }
      ]
      // Concours : inscriptions du jeudi au mardi 11:55, un Légendaire au gagnant.
      if (state.contest) {
        tiles.push({
          key: 'contest',
          label: 'Concours',
          available: this.contestOpen,
          nextResetAt: state.contest.status === 'registration_open' ? new Date(state.contest.date) : nextWeekly(4, 0),
          to: '/contest',
          reward: state.contest.isRegistered ? 'Inscrit·e — dévoilement mardi midi' : 'Un Légendaire pour le gagnant'
        })
      }
      if (this.leagueUnlocked) {
        tiles.push({
          key: 'league',
          label: 'Ligue des 4',
          available: open('league', !!state.league?.eligible && !state.league?.alreadyAttempted),
          nextResetAt: thursday,
          to: '/league',
          reward: 'Pièces ou capture d\'un légendaire'
        })
      }
      tiles.push({
        key: 'trade',
        label: 'Échange',
        available: open('trade', !!state.tradeEligibility?.eligible),
        nextResetAt: monday,
        to: '/trades',
        reward: 'Une carte manquante de même rareté'
      })
      if (state.spin?.hasStarters) {
        tiles.push({
          key: 'spin',
          // « Aventure » et non « Spin » : la navbar, la page et le Guide disent
          // Aventure — le hub était le seul à employer le mot interne.
          label: 'Aventure',
          available: open('spin', !state.spin?.rewardedThisWeek),
          nextResetAt: monday,
          to: '/spin',
          reward: 'Récompense hebdo + tentative légendaire'
        })
        // La tentative légendaire de l'Aventure est un rendez-vous à part pour
        // le serveur (10 captures par semaine) : on la montre dès qu'il la liste.
        const legendary = state.activities.find(a => a.key === 'spin_legendary')
        if (legendary) {
          tiles.push({
            key: 'spin_legendary',
            label: 'Aventure — légendaire',
            available: !legendary.done,
            nextResetAt: monday,
            to: '/spin',
            reward: 'Tentative de transfert d\'un légendaire'
          })
        }
      }
      // Toute activité que le serveur annonce et que nos tuiles ne couvrent
      // pas : on la relaie telle quelle plutôt que de la taire.
      const covered = new Set([...tiles.map(t => ACTIVITY_KEYS[t.key] ?? t.key), ...this.dailyTiles.map(t => ACTIVITY_KEYS[t.key] ?? t.key)])
      for (const a of state.activities) {
        if (covered.has(a.key)) continue
        const to = hashToRoute(a.link)
        if (!to) continue
        tiles.push({ key: a.key, label: a.label, available: !a.done, nextResetAt: monday, to, reward: '' })
      }
      return tiles
    }
  },

  actions: {
    // Données « fraîches » de la navbar (TTL court) — montées une fois au layout.
    async ensureShort(force = false) {
      if (!force && this.shortFetchedAt && Date.now() - this.shortFetchedAt < TTL_SHORT) return
      const api = useApi()
      const [trades, tournament, league, notifications, contest] = await Promise.all([
        dedupe('trades', () => tradesRepo.list(api)).catch(() => [] as DomainTrade[]),
        dedupe('tournament/current', () => tournamentRepo.current(api)).catch(() => null),
        dedupe('league/status', () => leagueRepo.status(api)).catch(() => null),
        dedupe('notifications', () => notificationsRepo.list(api)).catch(() => null),
        dedupe('contest/current', () => contestRepo.current(api)).catch(() => null)
      ])
      this.trades = trades
      this.tournament = tournament
      this.league = league
      this.notifications = notifications
      this.contest = contest
      this.shortFetchedAt = Date.now()
    },

    // Statuts de quotas (TTL plus long) — pour le hub.
    async ensureLong(force = false) {
      if (!force && this.longFetchedAt && Date.now() - this.longFetchedAt < TTL_LONG) return
      const api = useApi()
      // L'éligibilité aux échanges dépend de la région : 120 cartes uniques à
      // Kanto, 80 à Johto.
      const gen = useWalletStore().activeGeneration
      const [training, slot, spin, gyms, eligibility, motus, activities] = await Promise.all([
        dedupe('training/status', () => trainingRepo.status(api)).catch(() => null),
        dedupe('slot/status', () => slotRepo.status(api)).catch(() => null),
        dedupe('spin/status', () => spinRepo.status(api)).catch(() => null),
        dedupe('gym', () => gymRepo.getAll(api)).catch(() => [] as DomainGym[]),
        dedupe(`trades/eligibility/${gen}`, () => tradesRepo.eligibility(api, gen)).catch(() => null),
        dedupe('motus/today', () => motusRepo.today(api)).catch(() => null),
        dedupe('activities/today', () => activitiesRepo.today(api)).catch(() => [] as WireActivity[])
      ])
      this.training = training
      this.slot = slot
      this.spin = spin
      this.gyms = gyms
      this.tradeEligibility = eligibility
      this.motus = motus
      this.activities = activities
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
