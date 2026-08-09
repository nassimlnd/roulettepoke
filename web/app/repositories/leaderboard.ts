import type { WireLeaderboardResponse, WireRecentShiny } from '~/types/api'
import type { LeaderboardData, RecentShiny } from '~/types/domain'
import type { Generation } from '~/constants/generation'
import type { Api } from './_client'
import { normalizeLeaderboardRow, normalizeRecentShiny } from './normalize'

/**
 * Trois classements : le classement général, et un par région. Ils partagent
 * exactement la même forme de réponse, seul le chemin change.
 *
 * Il existait ici un quatrième appel, `/leaderboard/cheaters`, qui alimentait
 * un onglet « Tricheurs ». La route a disparu du serveur (404) : l'onglet
 * menait à une erreur. Les classements régionaux la remplacent.
 */
export type BoardScope = 'global' | 'kanto' | 'johto'

function boardPath(scope: BoardScope): string {
  return scope === 'global' ? '/leaderboard' : `/leaderboard/${scope}`
}

export const leaderboardRepo = {
  get: async (api: Api, scope: BoardScope = 'global'): Promise<LeaderboardData> => {
    const res = await api<WireLeaderboardResponse>(boardPath(scope))
    const ctx = res.playerContext
    return {
      top: res.top10.map(normalizeLeaderboardRow),
      player: ctx
        ? {
            above: ctx.above ? normalizeLeaderboardRow(ctx.above) : null,
            current: normalizeLeaderboardRow(ctx.current),
            below: ctx.below ? normalizeLeaderboardRow(ctx.below) : null
          }
        : null
    }
  },
  // Le feed accepte une génération : sans elle il mélange les deux régions.
  recentShinies: async (api: Api, generation?: Generation): Promise<RecentShiny[]> => {
    const { shinies } = await api<{ shinies: WireRecentShiny[] }>('/leaderboard/recent-shinies', {
      query: generation ? { generation } : undefined
    })
    return shinies.map(normalizeRecentShiny)
  }
}
