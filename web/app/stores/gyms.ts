import { defineStore } from 'pinia'
import { CACHE_TTL_SHORT } from '~/constants/cache'
import type { DomainGym, GymDetail, GymEstimate, BattleResult, TrainingOutcome } from '~/types/domain'
import type { TrainingStatus, UUID } from '~/types/api'
import type { Generation } from '~/constants/generation'
import { gymRepo, trainingRepo } from '~/repositories'
import { dedupe } from '~/utils/dedupe'

const TTL = CACHE_TTL_SHORT

export const useGymStore = defineStore('gyms', {
  state: () => ({
    gyms: [] as DomainGym[],
    training: null as TrainingStatus | null,
    details: {} as Record<UUID, GymDetail>,
    estimates: {} as Record<UUID, GymEstimate | null>,
    fetchedAt: 0
  }),

  getters: {
    // /gym renvoie les 16 arènes des deux régions d'un bloc. Le joueur n'en
    // parcourt qu'une à la fois : celle de sa génération active. Tout ce qui
    // suit — progression, badges, statut de champion — est donc borné au
    // circuit courant, comme dans le jeu d'origine.
    circuitGeneration: (): Generation => useWalletStore().activeGeneration,

    sorted(): DomainGym[] {
      return this.gyms
        .filter(g => g.generation === this.circuitGeneration)
        .sort((a, b) => a.order - b.order)
    },

    /** Nombre d'arènes du circuit courant (8, mais lu depuis l'API). */
    totalGyms(): number {
      return this.sorted.length
    },

    badgeCount(): number {
      return this.sorted.filter(g => g.hasBadge).length
    },

    isChampion(): boolean {
      return this.sorted.length > 0 && this.sorted.every(g => g.hasBadge)
    },

    /** Johto n'existe que depuis la v4 : ne proposer la bascule que s'il est là. */
    hasSecondCircuit: state => state.gyms.some(g => g.generation === 2)
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

    refreshBalance() {
      return useWalletStore().refreshFromServer('gym')
    }
  }
})
