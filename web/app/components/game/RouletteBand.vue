<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import type { DomainCard } from '~/types/domain'

const prefs = usePreferencesStore()
const sound = useSound()

const viewportEl = ref<HTMLElement | null>(null)
const { width: viewportWidth } = useElementSize(viewportEl)

const cardWidth = computed(() => (viewportWidth.value < 460 ? 88 : 112))
const GAP = 8

const engine = useRouletteEngine({
  cardWidth: () => cardWidth.value,
  gap: () => GAP,
  viewportWidth: () => viewportWidth.value || 360,
  reducedMotion: () => prefs.effectiveReducedMotion
})

const stripStyle = computed(() => ({
  transform: `translate3d(${engine.offset.value}px, 0, 0)`,
  transition: engine.durationMs.value
    ? `transform ${engine.durationMs.value}ms var(--ease-spin)`
    : 'none',
  gap: `${GAP}px`
}))

let tickTimers: number[] = []
function scheduleTicks(duration: number) {
  clearTicks()
  if (prefs.effectiveReducedMotion || prefs.muted) return
  // ~26 ticks espacés en décélération (approx. de la courbe) sur la durée.
  const n = 26
  for (let i = 1; i <= n; i++) {
    const p = i / n
    const eased = 1 - Math.pow(1 - p, 2.2) // slow-out
    tickTimers.push(window.setTimeout(() => sound.tick(), eased * duration))
  }
}
function clearTicks() {
  tickTimers.forEach(t => clearTimeout(t))
  tickTimers = []
}

async function spin(winner: DomainCard, pool: DomainCard[]) {
  sound.resume()
  const duration = prefs.effectiveReducedMotion ? 600 : 4000
  scheduleTicks(duration)
  await engine.spin(winner, pool)
  clearTicks()
}

function reset() {
  clearTicks()
  engine.reset()
}

onBeforeUnmount(clearTicks)

defineExpose({ spin, reset, state: engine.state })
</script>

<template>
  <div class="relative">
    <!-- Pointeur central -->
    <div
      class="pointer-events-none absolute left-1/2 top-0 z-10 h-full w-0.5 -translate-x-1/2 bg-primary"
      aria-hidden="true"
    >
      <div class="absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rotate-45 bg-primary" />
    </div>

    <div
      ref="viewportEl"
      class="roulette-viewport overflow-hidden rounded-xl border border-default bg-muted/40 py-3"
    >
      <div
        class="flex px-2 will-change-transform"
        :style="stripStyle"
      >
        <GameCard
          v-for="(card, i) in engine.strip.value"
          :key="i"
          :card="card"
          size="sm"
          :revealed="prefs.revealMode === 'visible' || engine.state.value === 'revealed'"
          class="!shrink-0"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.roulette-viewport {
  mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
}
</style>
