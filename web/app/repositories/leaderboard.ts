import type { WireLeaderboardResponse, WireLeaderboardRow, WireRecentShiny } from '~/types/api'
import type { LeaderboardData, LeaderboardRow, RecentShiny } from '~/types/domain'
import type { Api } from './_client'
import { normalizeLeaderboardRow, normalizeRecentShiny } from './normalize'

export const leaderboardRepo = {
  get: async (api: Api): Promise<LeaderboardData> => {
    const res = await api<WireLeaderboardResponse>('/leaderboard')
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
  cheaters: async (api: Api): Promise<LeaderboardRow[]> => {
    const { cheaters } = await api<{ cheaters: WireLeaderboardRow[] }>('/leaderboard/cheaters')
    return cheaters.map(normalizeLeaderboardRow)
  },
  recentShinies: async (api: Api): Promise<RecentShiny[]> => {
    const { shinies } = await api<{ shinies: WireRecentShiny[] }>('/leaderboard/recent-shinies')
    return shinies.map(normalizeRecentShiny)
  }
}
