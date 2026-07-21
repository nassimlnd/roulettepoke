import { defineStore } from 'pinia'
import type { SpinResult, RecentWin } from '~/types/domain'
import type { SlotStatus } from '~/types/api'
import { slotRepo } from '~/repositories'
import { dedupe } from '~/utils/dedupe'

const TTL = 60_000

export const useSlotStore = defineStore('slot', {
  state: () => ({
    status: null as SlotStatus | null,
    recentWins: [] as RecentWin[],
    fetchedAt: 0
  }),

  getters: {
    canSpin: state => !!state.status?.canSpin
  },

  actions: {
    async ensureFresh(force = false) {
      if (!force && this.status && Date.now() - this.fetchedAt < TTL) return
      this.status = await dedupe('slot/status', () => slotRepo.status(useApi()))
      this.fetchedAt = Date.now()
      this.loadRecentWins()
    },

    async loadRecentWins() {
      try {
        this.recentWins = await slotRepo.recentWins(useApi())
      } catch { /* silencieux */ }
    },

    // 1 partie/jour. mode 1 = 1 ligne (gratuit), 2 = 3 lignes (5 🪙), 3 = 3+diag (10 🪙).
    async spin(mode: 1 | 2 | 3): Promise<SpinResult> {
      const res = await slotRepo.spin(useApi(), mode)
      if (this.status) this.status.canSpin = false
      useWalletStore().reconcile(res.newCoins, 'slot')
      this.loadRecentWins()
      return res
    }
  }
})
