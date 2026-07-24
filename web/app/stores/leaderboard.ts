import { defineStore } from 'pinia'
import { CACHE_TTL_SHORT } from '~/constants/cache'
import type { LeaderboardData, LeaderboardRow, RecentShiny } from '~/types/domain'
import { leaderboardRepo } from '~/repositories'
import { dedupe } from '~/utils/dedupe'

const TTL = CACHE_TTL_SHORT

// Barème du score de diversité (cf. Guide) — affiché à titre indicatif.
export const SCORE_RULES = [
  { label: 'Standard', pts: 1 },
  { label: 'Légendaire', pts: 5 },
  { label: 'Shiny', pts: 10 },
  { label: 'Lég. Shiny', pts: 15 }
] as const

export const useLeaderboardStore = defineStore('leaderboard', {
  state: () => ({
    data: null as LeaderboardData | null,
    shinies: [] as RecentShiny[],
    cheaters: [] as LeaderboardRow[],
    fetchedAt: 0,
    cheatersFetched: false
  }),

  actions: {
    async ensureFresh(force = false) {
      if (!force && this.data && Date.now() - this.fetchedAt < TTL) return
      this.data = await dedupe('leaderboard/main', () => leaderboardRepo.get(useApi()))
      this.fetchedAt = Date.now()
      // Feed shiny chargé en arrière-plan (non bloquant).
      dedupe('leaderboard/shinies', () => leaderboardRepo.recentShinies(useApi()))
        .then((s) => { this.shinies = s })
        .catch(() => {})
    },

    async ensureCheaters() {
      if (this.cheatersFetched) return
      this.cheaters = await dedupe('leaderboard/cheaters', () => leaderboardRepo.cheaters(useApi()))
      this.cheatersFetched = true
    }
  }
})
