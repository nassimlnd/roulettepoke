<script setup lang="ts">
// Tourbillon d'ouverture (direction Mochidex) : N dos de cartes orbitent autour
// d'un halo doré pendant ~3 s avant la révélation. Teinté par le booster choisi.
const props = withDefaults(defineProps<{
  tint?: string // couleur du booster (biome) — var(--color-*) ou hex
  count?: number
}>(), {
  tint: 'var(--color-poke-500)',
  count: 9
})

const RADIUS = 168

const cards = computed(() => {
  const backs = [props.tint, '#f4b53c', '#4f9fd6']
  return Array.from({ length: props.count }, (_, i) => {
    const angle = (360 / props.count) * i
    const radius = i % 2 ? RADIUS - 26 : RADIUS
    const back = backs[i % backs.length]
    return {
      i,
      style: {
        '--a': angle + 'deg',
        '--r': radius + 'px',
        'background': `linear-gradient(150deg, ${back}, color-mix(in oklab, ${back} 70%, white))`,
        'zIndex': i % 2 ? 3 : 2,
        'filter': i % 2 ? 'brightness(.82) blur(1.4px)' : 'brightness(1.05)',
        'animationDelay': (i * 0.06).toFixed(3) + 's'
      }
    }
  })
})
</script>

<template>
  <div
    class="swirl"
    :style="{ '--tint': tint }"
    aria-hidden="true"
  >
    <div class="swirl__pivot">
      <div class="swirl__glow" />
      <div
        v-for="c in cards"
        :key="c.i"
        class="swirl__card"
        :style="c.style"
      >
        <span class="swirl__hatch" />
        <span class="swirl__shine" />
        <span class="swirl__ball">
          <PokeBall :size="50" />
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.swirl {
  --scale: 1;
  perspective: 1200px;
  height: 380px;
  display: grid;
  place-items: center;
}
.swirl__pivot {
  position: relative;
  width: 0;
  height: 0;
  transform: rotateX(15deg) scale(var(--scale));
  transform-style: preserve-3d;
}
.swirl__glow {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: radial-gradient(circle,
    rgba(255, 220, 120, .6),
    color-mix(in oklab, var(--tint) 42%, transparent) 45%,
    transparent 70%);
  animation: orbitGlow 1.4s ease-in-out infinite;
  pointer-events: none;
}
.swirl__card {
  position: absolute;
  left: -84px;
  top: -118px;
  width: 168px;
  height: 236px;
  border-radius: 18px;
  overflow: hidden;
  border: 3px solid rgba(255, 255, 255, .7);
  box-shadow: 0 16px 32px rgba(70, 50, 90, .38);
  display: grid;
  place-items: center;
  transform-origin: center;
  animation: orbit 3s cubic-bezier(.16, .72, .24, 1) both;
}
.swirl__hatch {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(45deg, rgba(255, 255, 255, .16) 0, rgba(255, 255, 255, .16) 7px, transparent 7px, transparent 16px);
}
.swirl__shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, .55) 50%, transparent 70%);
  background-size: 220% 220%;
  animation: shineSweep 2.4s linear infinite;
  mix-blend-mode: overlay;
}
.swirl__ball {
  position: relative;
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 255, 255, .92);
  box-shadow: 0 6px 16px rgba(0, 0, 0, .2);
}

@media (max-width: 560px) {
  .swirl { --scale: .64; }
}
</style>
