import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { CACHE_TTL_LONG } from '~/constants/cache'
import { STORAGE_KEYS } from '~/constants/storage-keys'
import type { WireOnboardingStatus, WireOnboardingClaim } from '~/types/api'
import { onboardingRepo } from '~/repositories'
import { dedupe } from '~/utils/dedupe'

// Checklist « Premiers pas » (4.4.0) : 8 étapes suivies par le serveur,
// 150 🪙 dans chaque région une fois tout fait. Le joueur peut y renoncer
// définitivement (clé partagée avec l'ancien front).
export const useOnboardingStore = defineStore('onboarding', {
  state: () => ({
    status: null as WireOnboardingStatus | null,
    fetchedAt: 0,
    dismissed: useStorage<string>(STORAGE_KEYS.onboardingDismissed, '')
  }),

  getters: {
    // Rien à montrer une fois la récompense réclamée, ou après renoncement.
    visible(state): boolean {
      if (state.dismissed === '1' || !state.status) return false
      return !(state.status.allDone && state.status.rewardClaimed)
    },
    doneCount: state => state.status?.steps.filter(s => s.done).length ?? 0
  },

  actions: {
    async ensureFresh(force = false) {
      if (this.dismissed === '1') return
      if (!force && this.status && Date.now() - this.fetchedAt < CACHE_TTL_LONG) return
      this.status = await dedupe('onboarding/status', () => onboardingRepo.status(useApi()))
      this.fetchedAt = Date.now()
    },

    async claim(): Promise<WireOnboardingClaim> {
      const res = await onboardingRepo.claim(useApi())
      if (this.status) this.status.rewardClaimed = true
      await useWalletStore().refreshFromServer('onboarding')
      return res
    },

    dismiss() {
      this.dismissed = '1'
    }
  }
})
