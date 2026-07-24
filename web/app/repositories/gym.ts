import type {
  WireBadge, WireGym, TrainingStatus, WireGymDetail, WireGymEstimate,
  WireBattleResult, WireTrainingResult, UUID
} from '~/types/api'
import type { DomainGym, GymDetail, GymEstimate, BattleResult, TrainingOutcome } from '~/types/domain'
import type { Api } from './_client'
import {
  normalizeGym, normalizeGymDetail, normalizeGymEstimate,
  normalizeBattleResult, normalizeTrainingOutcome
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
  getHistory: (api: Api) => api<unknown[]>('/gym/history')
}

export const trainingRepo = {
  status: (api: Api) => api<TrainingStatus>('/training/status'),
  battle: async (api: Api): Promise<TrainingOutcome> => {
    const t = await api<WireTrainingResult>('/training/battle', { method: 'POST' })
    return normalizeTrainingOutcome(t)
  }
}
