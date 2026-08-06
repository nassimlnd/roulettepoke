import { defineStore } from 'pinia'
import { CACHE_TTL_SHORT } from '~/constants/cache'
import type { DomainTournament, TournamentAnalysis } from '~/types/domain'
import { tournamentRepo } from '~/repositories'
import { dedupe } from '~/utils/dedupe'

const TTL = CACHE_TTL_SHORT
export const TOURNAMENT_ENTRY_FEE = 20

export const useTournamentStore = defineStore('tournament', {
  state: () => ({
    current: null as DomainTournament | null,
    analysis: null as TournamentAnalysis | null,
    fetchedAt: 0
  }),

  actions: {
    async ensureFresh(force = false) {
      if (!force && this.fetchedAt && Date.now() - this.fetchedAt < TTL) return
      this.current = await dedupe('tournament/current', () => tournamentRepo.current(useApi()))
      this.fetchedAt = Date.now()
      if (this.current?.isRegistered) {
        this.loadAnalysis()
      } else {
        this.analysis = null
      }
    },

    async loadAnalysis() {
      try {
        this.analysis = await dedupe('tournament/analysis', () => tournamentRepo.analysis(useApi()))
      } catch {
        this.analysis = null
      }
    },

    // Inscription : débite 20 🪙, fenêtre lundi → mardi 12:00.
    async register() {
      await tournamentRepo.register(useApi())
      await this.refreshBalance()
      await this.ensureFresh(true)
    },

    refreshBalance() {
      return useWalletStore().refreshFromServer('tournament')
    }
  }
})
