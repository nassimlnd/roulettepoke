import type { WireContest, WireContestSummary, WireContestPrizeOption, UUID } from '~/types/api'
import type { DomainContest, ContestSummary, ContestPrizeOption } from '~/types/domain'
import type { Currency } from '~/constants/generation'
import type { Api } from './_client'
import { normalizeContest, normalizeContestSummary, normalizeContestPrize } from './normalize'

// Concours hebdomadaire (v5.0) : inscriptions du jeudi au mardi 11:55,
// dévoilement le mardi à midi, un Légendaire pour le gagnant.
export const contestRepo = {
  current: async (api: Api): Promise<DomainContest | null> => {
    const { contest } = await api<{ contest: WireContest | null }>('/contest/current')
    return contest ? normalizeContest(contest) : null
  },
  byId: async (api: Api, id: UUID): Promise<DomainContest> => {
    const { contest } = await api<{ contest: WireContest }>(`/contest/${id}`)
    return normalizeContest(contest)
  },
  list: async (api: Api): Promise<ContestSummary[]> => {
    const { contests } = await api<{ contests: WireContestSummary[] }>('/contest/list')
    return contests.map(normalizeContestSummary)
  },
  // `currency` : la bourse qui paie les 10 🪙 — et la génération du Légendaire
  // offert au gagnant.
  register: (api: Api, cardId: UUID, currency: Currency) =>
    api('/contest/register', { method: 'POST', body: { cardId, currency } }),
  // La répétition de danse : le score ne part pas en clair mais encodé avec la
  // clé du jour (`code = manches + clé`), comme dans le client d'origine.
  danceKey: (api: Api) => api<{ key: number }>('/contest/dance-key'),
  danceScore: (api: Api, code: number) =>
    api('/contest/dance-score', { method: 'POST', body: { code } }),
  prizeOptions: async (api: Api, contestId: UUID): Promise<ContestPrizeOption[]> => {
    const { legendaries } = await api<{ legendaries: WireContestPrizeOption[] }>(`/contest/${contestId}/prize-options`)
    return legendaries.map(normalizeContestPrize)
  },
  claimPrize: (api: Api, contestId: UUID, cardId: UUID) =>
    api(`/contest/${contestId}/claim-prize`, { method: 'POST', body: { cardId } })
}
