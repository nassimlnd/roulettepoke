import { defineStore } from 'pinia'
import { CACHE_TTL_SHORT } from '~/constants/cache'
import type { LeaderboardData, RecentShiny } from '~/types/domain'
import type { BoardScope } from '~/repositories/leaderboard'
import { GENERATIONS } from '~/constants/generation'
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

const SCOPES: readonly BoardScope[] = ['global', ...GENERATIONS.map(g => g.boardScope)]
const EMPTY = (): Record<BoardScope, LeaderboardData | null> =>
  Object.fromEntries(SCOPES.map(s => [s, null])) as Record<BoardScope, LeaderboardData | null>
const NEVER = (): Record<BoardScope, number> =>
  Object.fromEntries(SCOPES.map(s => [s, 0])) as Record<BoardScope, number>

// Un classement par portée (général + une région), mis en cache séparément :
// passer de l'un à l'autre ne doit pas rejouer une requête, et surtout les
// tableaux ne doivent jamais se mélanger. Même schéma que les équipes.
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
      const gen = GENERATIONS.find(g => g.boardScope === scope)?.id
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
