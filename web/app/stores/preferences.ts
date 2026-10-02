import { defineStore } from 'pinia'
// Import explicite : useStorage entre en collision avec le useStorage de Nitro.
import { useStorage } from '@vueuse/core'
import { STORAGE_KEYS } from '~/constants/storage-keys'
import { DEFAULT_SPRITE_STYLE } from '~/constants/sprite-styles'

export type RevealMode = 'visible' | 'smart' | 'hidden'

// Préférences persistées (clés existantes réutilisées → migration douce).
export const usePreferencesStore = defineStore('preferences', () => {
  const revealMode = useStorage<RevealMode>(STORAGE_KEYS.revealMode, 'visible')
  const selectedBiome = useStorage<string>(STORAGE_KEYS.selectedBiome, '')
  const replaySpeed = useStorage<1 | 2 | 4>(STORAGE_KEYS.replaySpeed, 1)
  const volume = useStorage<number>(STORAGE_KEYS.volume, 0.7)
  const muted = useStorage<boolean>(STORAGE_KEYS.muted, false)
  const reducedMotionOverride = useStorage<'auto' | 'on' | 'off'>(STORAGE_KEYS.reducedMotion, 'auto')
  // Style des sprites de carte (cf. constants/sprite-styles.ts).
  const spriteStyle = useStorage<string>(STORAGE_KEYS.spriteStyle, DEFAULT_SPRITE_STYLE)

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
    spriteStyle,
    effectiveReducedMotion
  }
})
