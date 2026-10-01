import type { WireTournament, WireMyAnalysis } from '~/types/api'
import type { DomainTournament, TournamentAnalysis } from '~/types/domain'
import type { Api } from './_client'
import type { Currency } from '~/constants/generation'
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
  // `currency` = la bourse débitée (20 🪙) ET créditée en cas de gain. Sans
  // elle le serveur prend Kanto, même pour un joueur qui joue ailleurs.
  register: (api: Api, currency: Currency) =>
    api('/tournament/register', { method: 'POST', body: { currency } })
}
