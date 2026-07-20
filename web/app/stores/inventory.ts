import { defineStore } from 'pinia'
import type { WireInventory } from '~/types/api'
import { inventoryRepo } from '~/repositories'
import { dedupe } from '~/utils/dedupe'

const TTL = 5 * 60_000

export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    items: [] as { item_type: string, quantity: number }[],
    activeBiomeTicket: null as string | null,
    activeTypeTicket: null as string | null,
    fetchedAt: 0
  }),

  getters: {
    hasActiveTicket: state => !!(state.activeBiomeTicket || state.activeTypeTicket),
    charmeCount: state => state.items.find(i => i.item_type === 'charme_chroma')?.quantity ?? 0
  },

  actions: {
    async ensureFresh(force = false) {
      if (!force && this.fetchedAt && Date.now() - this.fetchedAt < TTL) return
      const data = await dedupe('inventory', () => inventoryRepo.get(useApi())) as WireInventory
      this.items = data.items
      this.activeBiomeTicket = data.activeBiomeTicket
      this.activeTypeTicket = data.activeTypeTicket
      this.fetchedAt = Date.now()
    },

    invalidate() {
      this.fetchedAt = 0
    }
  }
})
