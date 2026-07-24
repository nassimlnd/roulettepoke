import { defineStore } from 'pinia'
import { CACHE_TTL_SHORT } from '~/constants/cache'
import type { DomainGym, GymDetail, GymEstimate, BattleResult, TrainingOutcome } from '~/types/domain'
import type { TrainingStatus, UUID } from '~/types/api'
import { gymRepo, trainingRepo } from '~/repositories'
import { dedupe } from '~/utils/dedupe'

const TTL = CACHE_TTL_SHORT
export const TOTAL_GYMS = 8

export const useGymStore = defineStore('gyms', {
  state: () => ({
    gyms: [] as DomainGym[],
    training: null as TrainingStatus | null,
    details: {} as Record<UUID, GymDetail>,
    estimates: {} as Record<UUID, GymEstimate | null>,
    fetchedAt: 0
  }),

  getters: {
    sorted: state => [...state.gyms].sort((a, b) => a.order - b.order),
    badgeCount: state => state.gyms.filter(g => g.hasBadge).length,
    isChampion(): boolean {
      return this.gyms.length > 0 && this.gyms.every(g => g.hasBadge)
    }
  },

  actions: {
    async ensureFresh(force = false) {
      if (!force && this.gyms.length && Date.now() - this.fetchedAt < TTL) return
      this.gyms = await dedupe('gym/all', () => gymRepo.getAll(useApi()))
      this.fetchedAt = Date.now()
      this.refreshTraining()
    },

    async refreshTraining() {
      try {
        this.training = await dedupe('training/status', () => trainingRepo.status(useApi()))
      } catch { /* silencieux */ }
    },

    async loadDetail(id: UUID): Promise<GymDetail> {
      const cached = this.details[id]
      if (cached) return cached
      const d = await gymRepo.detail(useApi(), id)
      this.details[id] = d
      return d
    },

    // Retourne null si l'équipe est vide (400) — l'appelant invite à en composer une.
    async loadEstimate(id: UUID): Promise<GymEstimate | null> {
      try {
        const e = await gymRepo.estimate(useApi(), id)
        this.estimates[id] = e
        return e
      } catch {
        this.estimates[id] = null
        return null
      }
    },

    async battle(id: UUID): Promise<BattleResult> {
      const res = await gymRepo.battle(useApi(), id)
      // Un badge a pu être gagné (et le bonus d'entraînement remis à zéro).
      await this.ensureFresh(true)
      this.refreshBalance()
      return res
    },

    async train(): Promise<TrainingOutcome> {
      const res = await trainingRepo.battle(useApi())
      this.training = {
        bonus: res.newBonus,
        canFightToday: false,
        coins: (this.training?.coins ?? 0) + res.coinsGained
      }
      this.refreshBalance()
      return res
    },

    async refreshBalance() {
      try {
        const { user } = await useApi()<{ user: { coins: number } }>('/auth/me')
        if (user) useWalletStore().reconcile(user.coins, 'gym')
      } catch { /* silencieux */ }
    }
  }
})
