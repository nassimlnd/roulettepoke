import type {
  LeagueStatus, WireLeagueEstimate, WireLeagueRun, WireLegendaryEstimate, WireLegendaryReward, UUID
} from '~/types/api'
import type { DomainLeagueStatus, LeagueEstimate, LeagueRun, LegendaryOdds, LegendaryReward } from '~/types/domain'
import type { Api } from './_client'
import type { Currency } from '~/constants/generation'
import { normalizeLeagueStatus, normalizeLeagueEstimate, normalizeLeagueRun, normalizeLegendaryReward } from './normalize'

export const leagueRepo = {
  status: async (api: Api): Promise<DomainLeagueStatus> =>
    normalizeLeagueStatus(await api<LeagueStatus>('/league/status')),
  estimate: async (api: Api): Promise<LeagueEstimate> =>
    normalizeLeagueEstimate(await api<WireLeagueEstimate>('/league/estimate')),
  challenge: async (api: Api): Promise<LeagueRun> =>
    normalizeLeagueRun(await api<WireLeagueRun>('/league/challenge', { method: 'POST' })),
  // `currency` = la bourse qui reçoit les 500 🪙, parmi les régions dont le
  // joueur a les 8 badges. Sans elle le serveur retombe sur Kanto.
  rewardCoins: (api: Api, runId: UUID, currency?: Currency) =>
    api(`/league/${runId}/reward/coins`, { method: 'POST', body: currency ? { currency } : {} }),
  legendaryEstimate: async (api: Api, runId: UUID, cardId: UUID): Promise<LegendaryOdds> => {
    const e = await api<WireLegendaryEstimate>(`/league/${runId}/legendary-estimate/${cardId}`)
    return { captureProbability: e.capture_probability, challengers: e.challengers ?? [] }
  },
  rewardLegendary: async (api: Api, runId: UUID, cardId: UUID): Promise<LegendaryReward> =>
    normalizeLegendaryReward(await api<WireLegendaryReward>(`/league/${runId}/reward/legendary`, { method: 'POST', body: { cardId } }))
}
