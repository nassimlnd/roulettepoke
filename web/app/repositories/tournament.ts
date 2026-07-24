import type { WireTournament, WireMyAnalysis } from '~/types/api'
import type { DomainTournament, TournamentAnalysis } from '~/types/domain'
import type { Api } from './_client'
import { normalizeTournament, normalizeTournamentAnalysis } from './normalize'

export const tournamentRepo = {
  current: async (api: Api): Promise<DomainTournament | null> => {
    const { tournament } = await api<{ tournament: WireTournament | null }>('/tournament/current')
    return tournament ? normalizeTournament(tournament) : null
  },
  analysis: async (api: Api): Promise<TournamentAnalysis> => {
    const a = await api<WireMyAnalysis>('/tournament/my-analysis')
    return normalizeTournamentAnalysis(a)
  },
  register: (api: Api) => api('/tournament/register', { method: 'POST' })
}
