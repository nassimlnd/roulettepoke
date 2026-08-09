import { defineStore } from 'pinia'
import { CACHE_TTL_SHORT } from '~/constants/cache'
import type { LeaderboardData, RecentShiny } from '~/types/domain'
import type { BoardScope } from '~/repositories/leaderboard'
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

const EMPTY = (): Record<BoardScope, LeaderboardData | null> =>
  ({ global: null, kanto: null, johto: null })
const NEVER = (): Record<BoardScope, number> => ({ global: 0, kanto: 0, johto: 0 })

// Trois classements mis en cache séparément : passer de l'un à l'autre ne doit
// pas rejouer une requête, et surtout les tableaux ne doivent jamais se
// mélanger. Même schéma que les trois équipes.
export const useLeaderboardStore = defineStore('leaderboard', {
  state: () => ({
    boards: EMPTY(),
    fetchedAt: NEVER(),
    scope: 'global' as BoardScope,
    shinies: [] as RecentShiny[]
  }),

  getters: {
    data: (state): LeaderboardData | null => state.boards[state.scope]
  },

  actions: {
    async ensureFresh(force = false) {
      const scope = this.scope
      if (!force && this.boards[scope] && Date.now() - this.fetchedAt[scope] < TTL) return
      this.boards[scope] = await dedupe(`leaderboard/${scope}`, () => leaderboardRepo.get(useApi(), scope))
      this.fetchedAt[scope] = Date.now()

      // Feed shiny chargé en arrière-plan (non bloquant), borné à la région
      // affichée — sans quoi le classement de Kanto voisine des shiny de Johto.
      const gen = scope === 'global' ? undefined : (scope === 'kanto' ? 1 : 2)
      dedupe(`leaderboard/shinies/${scope}`, () => leaderboardRepo.recentShinies(useApi(), gen))
        .then((s) => { this.shinies = s })
        .catch(() => {})
    },

    async setScope(scope: BoardScope) {
      if (scope === this.scope) return
      this.scope = scope
      await this.ensureFresh()
    }
  }
})
