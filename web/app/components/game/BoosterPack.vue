<script setup lang="ts">
import type { Biome } from '~/types/api'
import { biomeSlug } from '~/utils/poke'

// Enveloppe de booster (style Mochidex) teintée par biome. Poké Ball au centre.
const props = withDefaults(defineProps<{
  biome: string // '' = Tous les biomes
  cost: number
  owned?: number
  total?: number
  size?: 'sm' | 'md' | 'lg'
  floating?: boolean
}>(), {
  size: 'md',
  floating: false
})

const WIDTHS = { sm: 152, md: 212, lg: 256 }
const label = computed(() => props.biome || 'Tous les biomes')
const tint = computed(() =>
  props.biome ? `var(--color-biome-${biomeSlug(props.biome as Biome)})` : 'var(--color-poke-500)')
const ballSize = computed(() => Math.round(WIDTHS[props.size] * 0.3))
</script>

<template>
  <div
    class="pack"
    :class="[`pack--${size}`, { 'pack--float': floating }]"
    :style="{ '--w': WIDTHS[size] + 'px', '--tint': tint }"
  >
    <div class="pack__body">
      <div class="pack__sheen" />
      <div class="pack__strip" />
      <div class="pack__title">
        BOOSTER
      </div>
      <div class="pack__biome">
        {{ label }}
      </div>
      <div class="pack__ball">
        <PokeBall :size="ballSize" />
      </div>
      <div class="pack__foot">
        <span
          v-if="total"
          class="tabular"
        >{{ owned }}/{{ total }}</span>
        <span
          v-else
          class="tabular"
        >Toutes régions</span>
        <span class="pack__cost tabular"><i />{{ cost }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pack {
  width: var(--w);
  aspect-ratio: 210 / 300;
  flex: none;
}
.pack--float { animation: floaty 4s ease-in-out infinite; }
.pack__body {
  position: relative;
  height: 100%;
  border-radius: calc(var(--w) * 0.1);
  overflow: hidden;
  background: linear-gradient(150deg, color-mix(in oklab, var(--tint) 42%, white) 0%, var(--tint) 62%, color-mix(in oklab, var(--tint) 78%, black) 100%);
  border: 3px solid rgba(255, 255, 255, .62);
  box-shadow: 0 22px 40px -10px color-mix(in oklab, var(--tint) 60%, transparent), inset 0 2px 0 rgba(255, 255, 255, .3);
}
.pack__sheen {
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, .6) 50%, transparent 70%);
  background-size: 220% 220%;
  animation: shineSweep 3.2s linear infinite;
  mix-blend-mode: overlay;
  pointer-events: none;
}
.pack__strip {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: calc(var(--w) * 0.16);
  height: 100%;
  background: repeating-linear-gradient(rgba(255, 255, 255, .4), rgba(255, 255, 255, .4) 6px, transparent 6px, transparent 12px);
  opacity: .35;
}
.pack__title {
  position: absolute;
  top: calc(var(--w) * 0.08);
  left: 0;
  right: 0;
  text-align: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: calc(var(--w) * 0.12);
  color: #fff;
  letter-spacing: .12em;
  text-shadow: 0 2px 6px rgba(0, 0, 0, .28);
}
.pack__biome {
  position: absolute;
  top: calc(var(--w) * 0.22);
  left: 0;
  right: 0;
  text-align: center;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: calc(var(--w) * 0.062);
  color: rgba(255, 255, 255, .92);
  letter-spacing: .04em;
  text-shadow: 0 1px 4px rgba(0, 0, 0, .3);
}
.pack__ball {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: calc(var(--w) * 0.46);
  height: calc(var(--w) * 0.46);
  border-radius: 50%;
  background: rgba(255, 255, 255, .9);
  display: grid;
  place-items: center;
  box-shadow: 0 8px 20px rgba(0, 0, 0, .2);
}
.pack__foot {
  position: absolute;
  bottom: calc(var(--w) * 0.06);
  left: calc(var(--w) * 0.09);
  right: calc(var(--w) * 0.09);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: calc(var(--w) * 0.052);
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, .35);
}
.pack__cost { display: inline-flex; align-items: center; gap: 4px; }
.pack__cost i {
  width: calc(var(--w) * 0.06);
  height: calc(var(--w) * 0.06);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff, #f6c453 62%, #e0a92e);
  box-shadow: 0 0 6px rgba(246, 196, 83, .7);
}
</style>
