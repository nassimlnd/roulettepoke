import type { WireSuggestion, WirePoll, UUID, VoteValue } from '~/types/api'
import type { DomainSuggestion, DomainPoll } from '~/types/domain'
import type { Api } from './_client'
import { normalizeSuggestion, normalizePoll } from './normalize'

// La voix des joueurs : suggestions (+ roadmap officielle) et sondages.
//
// Sémantique de vote VÉRIFIÉE contre l'API : sur une suggestion, revoter la
// même valeur RETIRE le vote (toggle) — l'UI propose donc l'annulation. Sur un
// sondage, on peut changer d'option tant qu'il est ouvert ; re-cliquer sa
// propre option n'a pas de sémantique vérifiable sans polluer un vrai sondage,
// l'UI la désactive donc.
//
// Les endpoints d'administration (créer/clore/archiver un sondage, éditer une
// suggestion, gérer les votants) ne sont volontairement PAS portés : ce front
// n'a pas de surface admin, et le compte de test ne permettrait pas de les
// vérifier.
export const suggestionsRepo = {
  list: async (api: Api): Promise<{ suggestions: DomainSuggestion[], isAdmin: boolean }> => {
    const res = await api<{ suggestions: WireSuggestion[], isAdmin?: boolean }>('/suggestions')
    return { suggestions: res.suggestions.map(normalizeSuggestion), isAdmin: !!res.isAdmin }
  },
  create: (api: Api, text: string) =>
    api('/suggestions', { method: 'POST', body: { text } }),
  vote: (api: Api, id: UUID, target: 'suggestion' | 'note', value: VoteValue) =>
    api(`/suggestions/${id}/vote`, { method: 'POST', body: { target, value } })
}

export const pollsRepo = {
  list: async (api: Api): Promise<DomainPoll[]> => {
    const res = await api<{ polls: WirePoll[] }>('/polls')
    return (res.polls ?? []).map(normalizePoll)
  },
  vote: (api: Api, id: UUID, optionId: UUID) =>
    api(`/polls/${id}/vote`, { method: 'POST', body: { optionId } })
}
