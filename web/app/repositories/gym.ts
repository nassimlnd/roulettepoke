import type {
  WireBadge, WireGym, TrainingStatus, WireGymDetail, WireGymEstimate,
  WireBattleResult, WireTrainingResult, WireGymAttempt, UUID
} from '~/types/api'
import type { DomainGym, GymDetail, GymEstimate, BattleResult, TrainingOutcome, GymAttempt } from '~/types/domain'
import type { Api } from './_client'
import {
  normalizeGym, normalizeGymDetail, normalizeGymEstimate,
  normalizeBattleResult, normalizeTrainingOutcome, normalizeGymAttempt
} from './normalize'

export const gymRepo = {
  getAll: async (api: Api): Promise<DomainGym[]> => {
    const gyms = await api<WireGym[]>('/gym')
    return gyms.map(normalizeGym)
  },
  getBadges: (api: Api) => api<WireBadge[]>('/gym/badges'),
  detail: async (api: Api, id: UUID): Promise<GymDetail> => {
    const d = await api<WireGymDetail>(`/gym/${id}`)
    return normalizeGymDetail(d)
  },
  estimate: async (api: Api, id: UUID): Promise<GymEstimate> => {
    const e = await api<WireGymEstimate>(`/gym/${id}/estimate`)
    return normalizeGymEstimate(e)
  },
  battle: async (api: Api, id: UUID): Promise<BattleResult> => {
    const b = await api<WireBattleResult>(`/gym/${id}/battle`, { method: 'POST' })
    return normalizeBattleResult(b)
  },
  getHistory: async (api: Api): Promise<GymAttempt[]> => {
    const rows = await api<WireGymAttempt[]>('/gym/history')
    return (rows ?? []).map(normalizeGymAttempt)
  }
}

export const trainingRepo = {
  status: (api: Api) => api<TrainingStatus>('/training/status'),
  // `generation` = le parcours visé ; le client d'origine envoie l'onglet
  // actif, et le serveur retombe sur Kanto si le champ manque.
  battle: async (api: Api, generation: number): Promise<TrainingOutcome> => {
    const t = await api<WireTrainingResult>('/training/battle', { method: 'POST', body: { generation } })
    return normalizeTrainingOutcome(t)
  }
}
