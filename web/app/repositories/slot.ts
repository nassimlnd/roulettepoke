import type { SlotStatus, WireSpinResult, WireRecentWin } from '~/types/api'
import type { SpinResult, RecentWin } from '~/types/domain'
import type { Api } from './_client'
import { normalizeSpinResult, normalizeRecentWin } from './normalize'

export const slotRepo = {
  status: (api: Api) => api<SlotStatus>('/slot-machine/status'),
  spin: async (api: Api, lines: 1 | 2 | 3): Promise<SpinResult> => {
    const w = await api<WireSpinResult>('/slot-machine/spin', { method: 'POST', body: { lines } })
    return normalizeSpinResult(w)
  },
  recentWins: async (api: Api): Promise<RecentWin[]> => {
    const { wins } = await api<{ wins: WireRecentWin[] }>('/slot-machine/recent-wins')
    return wins.map(normalizeRecentWin)
  }
}
