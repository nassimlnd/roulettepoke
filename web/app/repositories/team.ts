import type { WireTeamMember, UUID } from '~/types/api'
import type { TeamScope } from '~/constants/generation'
import type { TeamMember } from '~/types/domain'
import type { Api } from './_client'
import { normalizeTeamMember } from './normalize'

// Le joueur entretient une équipe de 6 Pokémon PAR PORTÉE : `global` sert le
// Tournoi et la Ligue des 4, `gen1`, `gen2`, `gen3` les arènes de chaque
// région. Les valeurs sont vérifiées contre l'API : `kanto`/`johto` sont
// refusés (« Portée d'équipe invalide »).
//
// Seules la lecture, le tirage et la vidange prennent la portée ; l'échange et
// le retrait s'appuient sur l'identifiant d'entrée, qui est déjà unique.
export const teamRepo = {
  get: async (api: Api, scope: TeamScope): Promise<TeamMember[]> => {
    const members = await api<WireTeamMember[]>('/team', { query: { scope } })
    return members.map(normalizeTeamMember)
  },
  roll: async (api: Api, scope: TeamScope): Promise<TeamMember> => {
    const member = await api<WireTeamMember>('/team/roll', { method: 'POST', query: { scope } })
    return normalizeTeamMember(member)
  },
  swap: (api: Api, idA: UUID, idB: UUID) => api('/team/swap', { method: 'POST', body: { idA, idB } }),
  remove: (api: Api, teamEntryId: UUID) => api(`/team/${teamEntryId}`, { method: 'DELETE' }),
  clear: (api: Api, scope: TeamScope) => api('/team', { method: 'DELETE', query: { scope } })
}
