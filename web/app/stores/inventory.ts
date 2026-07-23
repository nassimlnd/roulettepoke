import { defineStore } from 'pinia'
import type { WireInventory } from '~/types/api'
import { inventoryRepo } from '~/repositories'
import { dedupe } from '~/utils/dedupe'
import { BIOME_SLUG_TO_NAME, TYPE_SLUG_TO_NAME } from '~/utils/poke'

const TTL = 5 * 60_000

export interface InvTicket { slug: string, name: string, quantity: number }

// Inventaire du joueur : Charme Chroma (booste le shiny) + tickets biome/type
// (filtrent le PROCHAIN tirage, à usage unique). Un seul ticket actif à la fois
// (biome OU type) — règle métier reprise du jeu original (inventoryModal.js).
export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    items: [] as { item_type: string, quantity: number }[],
    activeBiomeTicket: null as string | null,
    activeTypeTicket: null as string | null,
    fetchedAt: 0
  }),

  getters: {
    charmeCount: state => state.items.find(i => i.item_type === 'charme_chroma')?.quantity ?? 0,

    biomeTickets: (state): InvTicket[] => state.items
      .filter(i => i.item_type.startsWith('tirage_biome_') && i.quantity > 0)
      .map((i) => {
        const slug = i.item_type.replace('tirage_biome_', '')
        return { slug, name: BIOME_SLUG_TO_NAME[slug] ?? slug, quantity: i.quantity }
      }),

    typeTickets: (state): InvTicket[] => state.items
      .filter(i => i.item_type.startsWith('tirage_type_') && i.quantity > 0)
      .map((i) => {
        const slug = i.item_type.replace('tirage_type_', '')
        return { slug, name: TYPE_SLUG_TO_NAME[slug] ?? slug, quantity: i.quantity }
      }),

    hasActiveTicket: state => !!(state.activeBiomeTicket || state.activeTypeTicket),
    activeBiomeName: state => (state.activeBiomeTicket ? (BIOME_SLUG_TO_NAME[state.activeBiomeTicket] ?? state.activeBiomeTicket) : null),
    activeTypeName: state => (state.activeTypeTicket ? (TYPE_SLUG_TO_NAME[state.activeTypeTicket] ?? state.activeTypeTicket) : null),

    isEmpty(): boolean {
      return this.charmeCount === 0 && this.biomeTickets.length === 0 && this.typeTickets.length === 0
        && !this.activeBiomeTicket && !this.activeTypeTicket
    }
  },

  actions: {
    async ensureFresh(force = false) {
      if (!force && this.fetchedAt && Date.now() - this.fetchedAt < TTL) return
      this._apply(await dedupe('inventory', () => inventoryRepo.get(useApi())) as WireInventory)
    },

    // Rafraîchit sans cache — appelé après chaque mutation (activation/tirage) :
    // les tickets sont à usage unique, l'état serveur fait foi.
    async refresh() {
      this._apply(await inventoryRepo.get(useApi()))
    },

    _apply(data: WireInventory) {
      this.items = data.items ?? []
      this.activeBiomeTicket = data.activeBiomeTicket
      this.activeTypeTicket = data.activeTypeTicket
      this.fetchedAt = Date.now()
    },

    async activateCharme(): Promise<number> {
      const res = await inventoryRepo.activateCharme(useApi())
      const rolls = res.charme_chroma_rolls ?? res.rolls ?? 0
      useAuthStore().setCharmeRolls(rolls)
      await this.refresh()
      return rolls
    },

    async activateBiomeTicket(slug: string) {
      await inventoryRepo.activateBiomeTicket(useApi(), slug)
      await this.refresh()
    },
    async activateTypeTicket(slug: string) {
      await inventoryRepo.activateTypeTicket(useApi(), slug)
      await this.refresh()
    },
    async deactivateBiomeTicket() {
      await inventoryRepo.deactivateBiomeTicket(useApi())
      await this.refresh()
    },
    async deactivateTypeTicket() {
      await inventoryRepo.deactivateTypeTicket(useApi())
      await this.refresh()
    },

    invalidate() {
      this.fetchedAt = 0
    }
  }
})
