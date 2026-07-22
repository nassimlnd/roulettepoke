<script setup lang="ts">
import type { AdventureMon } from '~/types/domain'

// Évolution façon Pokémon classique : les deux silhouettes blanches clignotent en
// s'alternant, un flash, puis la nouvelle forme se révèle en couleur avec éclats.
const props = defineProps<{ from: AdventureMon, to: AdventureMon }>()
const emit = defineEmits<{ done: [] }>()
const reduced = usePreferredReducedMotion()

const phase = ref<'morph' | 'done'>('morph')
let timer: ReturnType<typeof setTimeout>
onMounted(() => {
  const delay = reduced.value === 'reduce' ? 40 : 2100
  timer = setTimeout(() => {
    phase.value = 'done'
  }, delay)
})
onBeforeUnmount(() => clearTimeout(timer))

const title = computed(() =>
  phase.value === 'done'
    ? `${props.from.name} a évolué en ${props.to.name} !`
    : `Hein ? ${props.from.name} évolue !`)
</script>

<template>
  <div
    class="evo"
    :class="phase"
  >
    <div class="evo__stage">
      <img
        class="evo__mon evo__from"
        :src="from.imageUrl"
        :alt="from.name"
      >
      <img
        class="evo__mon evo__to"
        :src="to.imageUrl"
        :alt="to.name"
      >
      <span
        v-for="s in 10"
        :key="s"
        class="evo__spark"
        :style="{ '--i': s }"
      />
    </div>
    <span class="evo__flash" />
    <p class="evo__title font-display">
      {{ title }}
    </p>
    <PButton
      v-if="phase === 'done'"
      color="primary"
      size="lg"
      class="evo__cta"
      @click="emit('done')"
    >
      <UIcon
        name="i-lucide-check"
        class="size-5"
      /> Continuer
    </PButton>
  </div>
</template>

<style scoped>
.evo {
  margin: auto;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
  padding: 28px 24px;
}
.evo__stage {
  position: relative;
  width: 220px;
  height: 220px;
  display: grid;
  place-items: center;
}
.evo__mon {
  position: absolute;
  width: 190px;
  height: 190px;
  object-fit: contain;
  image-rendering: pixelated;
}
/* Phase « morph » : deux silhouettes blanches qui clignotent en alternance. */
.evo.morph .evo__mon { filter: brightness(0) invert(1) drop-shadow(0 0 14px #cfe4ff); }
.evo.morph .evo__from { animation: flashFrom 2.1s ease-in both; }
.evo.morph .evo__to { animation: flashTo 2.1s ease-in both; }
/* Phase « done » : la nouvelle forme en couleur, l'ancienne masquée. */
.evo.done .evo__from { display: none; }
.evo.done .evo__to { filter: drop-shadow(0 10px 14px rgba(58, 47, 40, .34)); animation: evoIn .55s var(--ease-pop) both; }

.evo__spark {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff3c4;
  box-shadow: 0 0 10px #ffe89a;
  opacity: 0;
  --a: calc(var(--i) * 36deg);
}
.evo.done .evo__spark { animation: evoSpark .8s ease-out .12s forwards; }

.evo__flash {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: radial-gradient(circle at 50% 42%, #fff, rgba(255, 255, 255, .3) 55%, transparent);
  opacity: 0;
  pointer-events: none;
}
.evo.done .evo__flash { animation: evoFlash .5s ease-out both; }

.evo__title { font-weight: 800; font-size: 1.24rem; line-height: 1.3; color: var(--ui-text-highlighted); min-height: 2.4em; }
.evo.done .evo__title { color: #7c4fb0; }
.evo__cta { margin-top: 4px; }

@keyframes flashFrom {
  0%, 8% { opacity: 1; } 12%, 22% { opacity: 0; } 28% { opacity: 1; } 34% { opacity: 0; }
  44% { opacity: 1; } 50% { opacity: 0; } 60% { opacity: 1; } 66% { opacity: 0; }
  76% { opacity: 1; } 82% { opacity: 0; } 90% { opacity: 1; } 100% { opacity: 0; }
}
@keyframes flashTo {
  0%, 8% { opacity: 0; } 12%, 22% { opacity: 1; } 28% { opacity: 0; } 34% { opacity: 1; }
  44% { opacity: 0; } 50% { opacity: 1; } 60% { opacity: 0; } 66% { opacity: 1; }
  76% { opacity: 0; } 82% { opacity: 1; } 90% { opacity: 0; } 100% { opacity: 1; }
}
@keyframes evoIn { 0% { transform: scale(.4); opacity: 0; } 60% { transform: scale(1.14); opacity: 1; } 100% { transform: scale(1); } }
@keyframes evoFlash { 0% { opacity: 0; } 20% { opacity: 1; } 100% { opacity: 0; } }
@keyframes evoSpark { to { opacity: 0; transform: translate(calc(cos(var(--a)) * 120px), calc(sin(var(--a)) * 120px)) scale(.3); } }

@media (prefers-reduced-motion: reduce) {
  .evo.morph .evo__from, .evo.morph .evo__to, .evo.done .evo__to, .evo.done .evo__flash, .evo.done .evo__spark { animation: none; }
  .evo.morph .evo__mon { filter: none; }
  .evo.morph .evo__from { display: none; }
}
</style>
