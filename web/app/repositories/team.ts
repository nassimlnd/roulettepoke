import type { WireTeamMember, UUID } from '~/types/api'
import type { TeamMember } from '~/types/domain'
import type { Api } from './_client'
import { normalizeTeamMember } from './normalize'

export const teamRepo = {
  get: async (api: Api): Promise<TeamMember[]> => {
    const members = await api<WireTeamMember[]>('/team')
    return members.map(normalizeTeamMember)
  },
  roll: async (api: Api): Promise<TeamMember> => {
    const member = await api<WireTeamMember>('/team/roll', { method: 'POST' })
    return normalizeTeamMember(member)
  },
  swap: (api: Api, idA: UUID, idB: UUID) => api('/team/swap', { method: 'POST', body: { idA, idB } }),
  remove: (api: Api, teamEntryId: UUID) => api(`/team/${teamEntryId}`, { method: 'DELETE' }),
  clear: (api: Api) => api('/team', { method: 'DELETE' })
}
