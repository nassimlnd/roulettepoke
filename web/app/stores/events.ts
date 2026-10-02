import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { CACHE_TTL_SHORT } from '~/constants/cache'
import { STORAGE_KEYS } from '~/constants/storage-keys'
import type { WireGameEvents } from '~/types/api'
import { eventsRepo } from '~/repositories'
import { dedupe } from '~/utils/dedupe'
import { describeGameEvent, eventsSignature, findMerchant, describeGoal } from '~/utils/gameEvents'
import { BASE_ROLL_COST } from '~/constants/game'

// /game-events/current porte trois choses : les événements surprise du jour,
// l'objectif collectif de la semaine et le prix effectif du tirage. Un seul
// store les tient, avec une fraîcheur courte — ils changent dans la journée.
export const useEventsStore = defineStore('events', {
  state: () => ({
    data: null as WireGameEvents | null,
    fetchedAt: 0,
    // Le bandeau masqué par le joueur ne revient que si l'empreinte du jour
    // change (nouvel événement, nouveau jour).
    dismissed: useStorage<string>(STORAGE_KEYS.eventsDismissed, '')
  }),

  getters: {
    active: state => (state.data?.events.active ?? [])
      .map(describeGameEvent)
      .filter((v): v is NonNullable<typeof v> => v !== null),
    signature: state => eventsSignature(state.data?.events),
    stripVisible(): boolean {
      return this.active.length > 0 && this.signature !== this.dismissed
    },
    merchant: state => findMerchant(state.data?.events),
    goal: state => state.data?.goal ?? null,
    goalView: state => describeGoal(state.data?.goal),
    rollCost: (state): { base: number, effective: number } => {
      const base = state.data?.rollCost?.base ?? BASE_ROLL_COST
      return { base, effective: state.data?.rollCost?.effective ?? base }
    }
  },

  actions: {
    async ensureFresh(force = false) {
      if (!force && this.data && Date.now() - this.fetchedAt < CACHE_TTL_SHORT) return
      this.data = await dedupe('game-events', () => eventsRepo.current(useApi()))
      this.fetchedAt = Date.now()
    },

    dismissStrip() {
      this.dismissed = this.signature
    }
  }
})
