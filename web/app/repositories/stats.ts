import type { WireStats } from '~/types/api'
import type { DomainStats } from '~/types/domain'
import type { Api } from './_client'
import { normalizeStats } from './normalize'

export const statsRepo = {
  get: async (api: Api): Promise<DomainStats> => normalizeStats(await api<WireStats>('/stats'))
}
