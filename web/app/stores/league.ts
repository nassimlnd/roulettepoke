import { defineStore } from 'pinia'
import { CACHE_TTL_SHORT } from '~/constants/cache'
import type { DomainLeagueStatus, LeagueEstimate, LeagueRun, LegendaryReward } from '~/types/domain'
import type { UUID } from '~/types/api'
import { leagueRepo } from '~/repositories'

// Ligue des 4 (Elite Four) : statut hebdomadaire, estimation, défi (1/semaine),
// puis récompense (500 pièces ou capture d'un légendaire).
const TTL = CACHE_TTL_SHORT
export const LEAGUE_COINS_REWARD = 500

export const useLeagueStore = defineStore('league', {
  state: () => ({
    status: null as DomainLeagueStatus | null,
    estimate: null as LeagueEstimate | null,
    run: null as LeagueRun | null,
    rewardTaken: false,
    legendaryResult: null as LegendaryReward | null,
    fetchedAt: 0
  }),

  actions: {
    async ensureFresh(force = false) {
      if (!force && this.status && Date.now() - this.fetchedAt < TTL) return
      this.status = await leagueRepo.status(useApi())
      this.fetchedAt = Date.now()
    },

    async loadEstimate() {
      this.estimate = await leagueRepo.estimate(useApi())
    },

    async challenge(): Promise<LeagueRun> {
      const run = await leagueRepo.challenge(useApi())
      this.run = run
      this.rewardTaken = false
      this.legendaryResult = null
      if (this.status) this.status.alreadyAttempted = true
      return run
    },

    async claimCoins() {
      if (!this.run) return
      await leagueRepo.rewardCoins(useApi(), this.run.runId)
      this.rewardTaken = true
    },

    legendaryOdds(cardId: UUID) {
      if (!this.run) return Promise.reject(new Error('Aucun défi en cours'))
      return leagueRepo.legendaryEstimate(useApi(), this.run.runId, cardId)
    },

    async captureLegendary(cardId: UUID): Promise<LegendaryReward | null> {
      if (!this.run) return null
      const res = await leagueRepo.rewardLegendary(useApi(), this.run.runId, cardId)
      this.legendaryResult = res
      this.rewardTaken = true
      return res
    }
  }
})
