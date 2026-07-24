import type {
  LeagueStatus, WireLeagueEstimate, WireLeagueRun, WireLegendaryEstimate, WireLegendaryReward, UUID
} from '~/types/api'
import type { DomainLeagueStatus, LeagueEstimate, LeagueRun, LegendaryOdds, LegendaryReward } from '~/types/domain'
import type { Api } from './_client'
import { normalizeLeagueStatus, normalizeLeagueEstimate, normalizeLeagueRun, normalizeLegendaryReward } from './normalize'

export const leagueRepo = {
  status: async (api: Api): Promise<DomainLeagueStatus> =>
    normalizeLeagueStatus(await api<LeagueStatus>('/league/status')),
  estimate: async (api: Api): Promise<LeagueEstimate> =>
    normalizeLeagueEstimate(await api<WireLeagueEstimate>('/league/estimate')),
  challenge: async (api: Api): Promise<LeagueRun> =>
    normalizeLeagueRun(await api<WireLeagueRun>('/league/challenge', { method: 'POST' })),
  rewardCoins: (api: Api, runId: UUID) =>
    api(`/league/${runId}/reward/coins`, { method: 'POST' }),
  legendaryEstimate: async (api: Api, runId: UUID, cardId: UUID): Promise<LegendaryOdds> => {
    const e = await api<WireLegendaryEstimate>(`/league/${runId}/legendary-estimate/${cardId}`)
    return { captureProbability: e.capture_probability, challengers: e.challengers ?? [] }
  },
  rewardLegendary: async (api: Api, runId: UUID, cardId: UUID): Promise<LegendaryReward> =>
    normalizeLegendaryReward(await api<WireLegendaryReward>(`/league/${runId}/reward/legendary`, { method: 'POST', body: { cardId } }))
}
