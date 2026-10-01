import { defineStore } from 'pinia'
import { CACHE_TTL_SHORT } from '~/constants/cache'
import type { SpinResult, RecentWin, SlotRecord } from '~/types/domain'
import type { SlotStatus } from '~/types/api'
import { slotRepo } from '~/repositories'
import { dedupe } from '~/utils/dedupe'

const TTL = CACHE_TTL_SHORT

export const useSlotStore = defineStore('slot', {
  state: () => ({
    status: null as SlotStatus | null,
    recentWins: [] as RecentWin[],
    // Mes parties (v5) : lots gagnés, mise, date — du plus récent au plus ancien.
    myHistory: [] as SlotRecord[],
    fetchedAt: 0
  }),

  getters: {
    canSpin: state => !!state.status?.canSpin,
    // « Jackpot en folie » (v5.1) : deux tirages le jour de l'événement. Les
    // champs sont absents des anciennes réponses → 1 tirage, comme avant.
    spinsAllowed: state => state.status?.spinsAllowed ?? 1,
    spinsLeft(): number {
      const today = this.status?.spinsToday ?? (this.canSpin ? 0 : 1)
      return Math.max(0, this.spinsAllowed - today)
    }
  },

  actions: {
    async ensureFresh(force = false) {
      if (!force && this.status && Date.now() - this.fetchedAt < TTL) return
      this.status = await dedupe('slot/status', () => slotRepo.status(useApi()))
      this.fetchedAt = Date.now()
      this.loadRecentWins()
      this.loadMyHistory()
    },

    async loadRecentWins() {
      try {
        this.recentWins = await slotRepo.recentWins(useApi())
      } catch { /* silencieux */ }
    },

    async loadMyHistory() {
      try {
        this.myHistory = await slotRepo.myHistory(useApi())
      } catch { /* silencieux */ }
    },

    // 1 partie/jour (2 en folie). mode 1 = 1 ligne (gratuit), 2 = 3 lignes
    // (5 🪙), 3 = 3+diag (10 🪙). Le droit de rejouer et la bourse créditée
    // (celle de la génération active côté serveur) sont relus depuis le
    // serveur plutôt que devinés.
    async spin(mode: 1 | 2 | 3): Promise<SpinResult> {
      const res = await slotRepo.spin(useApi(), mode)
      if (this.status) this.status.canSpin = false
      await Promise.all([
        useWalletStore().refreshFromServer('slot'),
        this.ensureFresh(true).catch(() => {})
      ])
      return res
    }
  }
})
