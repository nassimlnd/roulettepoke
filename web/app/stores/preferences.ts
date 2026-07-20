import { defineStore } from 'pinia'
// Import explicite : useStorage entre en collision avec le useStorage de Nitro.
import { useStorage } from '@vueuse/core'

export type RevealMode = 'visible' | 'smart' | 'hidden'

// Préférences persistées (clés existantes réutilisées → migration douce).
export const usePreferencesStore = defineStore('preferences', () => {
  const revealMode = useStorage<RevealMode>('gacha_reveal_mode', 'visible')
  const selectedBiome = useStorage<string>('gacha_selected_biome', '')
  const replaySpeed = useStorage<1 | 2 | 4>('replay_speed', 1)
  const volume = useStorage<number>('pkr_volume', 0.7)
  const muted = useStorage<boolean>('pkr_muted', false)
  const reducedMotionOverride = useStorage<'auto' | 'on' | 'off'>('pkr_reduced_motion', 'auto')

  const systemReducedMotion = usePreferredReducedMotion()

  const effectiveReducedMotion = computed(() => {
    if (reducedMotionOverride.value === 'on') return true
    if (reducedMotionOverride.value === 'off') return false
    return systemReducedMotion.value === 'reduce'
  })

  return {
    revealMode,
    selectedBiome,
    replaySpeed,
    volume,
    muted,
    reducedMotionOverride,
    effectiveReducedMotion
  }
})
