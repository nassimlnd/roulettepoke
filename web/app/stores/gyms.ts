import { defineStore } from 'pinia'
import { CACHE_TTL_SHORT } from '~/constants/cache'
import type { DomainGym, GymDetail, GymEstimate, BattleResult, TrainingOutcome, GymAttempt } from '~/types/domain'
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
    fetchedAt: 0,
    // Historique des combats (v5), toutes régions ; filtré par circuit à l'affichage.
    history: [] as GymAttempt[],
    historyLoaded: false
  }),

  getters: {
    // /gym renvoie d'un bloc les arènes de toutes les régions (8 par région).
    // Le joueur n'en parcourt qu'une à la fois : celle de sa génération
    // active. Tout ce qui suit — progression, badges, statut de champion — est
    // donc borné au circuit courant, comme dans le jeu d'origine.
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

    circuitHistory(): GymAttempt[] {
      return this.history
        .filter(a => a.generation === this.circuitGeneration)
        .sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt))
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

    // L'entraînement porte sur le parcours AFFICHÉ : sans `generation`, le
    // serveur retombe sur Kanto et le bonus irait au mauvais circuit.
    async train(): Promise<TrainingOutcome> {
      const res = await trainingRepo.battle(useApi(), this.circuitGeneration)
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
    },

    // Non bloquant : la section reste vide si l'appel échoue.
    async loadHistory(force = false) {
      if (this.historyLoaded && !force) return
      try {
        this.history = await dedupe('gym/history', () => gymRepo.getHistory(useApi()))
        this.historyLoaded = true
      } catch { /* silencieux */ }
    }
  }
})
