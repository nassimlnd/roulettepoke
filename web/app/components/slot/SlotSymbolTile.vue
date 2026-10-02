<script setup lang="ts">
import type { SlotSymbol } from '~/types/api'
import { SLOT_SYMBOLS } from '~/utils/slot'

// Pastille d'un symbole de la machine (icône teintée par symbole).
const props = withDefaults(defineProps<{ symbol: SlotSymbol, size?: number }>(), { size: 46 })
const meta = computed(() => SLOT_SYMBOLS[props.symbol])
</script>

<template>
  <span
    class="sym"
    :style="{ '--c': meta.color, '--s': size + 'px' }"
    :title="meta.label"
  >
    <UIcon
      :name="meta.icon"
      class="sym__icon"
    />
  </span>
</template>

<style scoped>
.sym {
  display: grid;
  place-items: center;
  width: var(--s);
  height: var(--s);
  border-radius: 27%;
  color: var(--c);
  background: radial-gradient(circle at 50% 30%, color-mix(in oklab, var(--c) 30%, #fff), color-mix(in oklab, var(--c) 12%, #fff));
  box-shadow: inset 0 0 0 2px color-mix(in oklab, var(--c) 42%, transparent), 0 2px 5px rgba(0, 0, 0, .1);
}
.sym__icon { width: 58%; height: 58%; }
</style>
