import { defineStore } from 'pinia'
import { CACHE_TTL_MEDIUM } from '~/constants/cache'
import type { DomainStats } from '~/types/domain'
import { statsRepo } from '~/repositories'

// Statistiques globales (GET /stats) — un seul gros payload agrégé, mis en cache
// (TTL) : la page ne re-fetch pas à chaque visite.
const TTL = CACHE_TTL_MEDIUM

export const useStatsStore = defineStore('stats', {
  state: () => ({
    data: null as DomainStats | null,
    fetchedAt: 0
  }),

  actions: {
    async ensureFresh(force = false) {
      if (!force && this.data && Date.now() - this.fetchedAt < TTL) return
      this.data = await statsRepo.get(useApi())
      this.fetchedAt = Date.now()
    }
  }
})
