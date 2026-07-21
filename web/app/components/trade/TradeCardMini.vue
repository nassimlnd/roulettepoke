<script setup lang="ts">
import type { RealRarity } from '~/types/domain'
import { RARITY_META } from '~/utils/cardTheme'

// Vignette compacte d'une carte échangée (sprite + nom + rareté).
const props = defineProps<{ name: string, imageUrl: string | null, rarity: RealRarity, label?: string }>()
const meta = computed(() => RARITY_META[props.rarity])
</script>

<template>
  <div
    class="tcm"
    :style="{ '--r': meta.color }"
  >
    <span
      v-if="label"
      class="tcm__label"
    >{{ label }}</span>
    <div class="tcm__frame">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="name"
        loading="lazy"
      >
      <UIcon
        v-else
        name="i-lucide-image"
        class="tcm__fb"
      />
    </div>
    <span class="tcm__name">{{ name }}</span>
    <span class="tcm__rarity">{{ rarity }}</span>
  </div>
</template>

<style scoped>
.tcm { display: flex; flex-direction: column; align-items: center; gap: 3px; width: 82px; }
.tcm__label { font-size: .62rem; font-weight: 800; text-transform: uppercase; letter-spacing: .03em; color: var(--ui-text-dimmed); }
.tcm__frame {
  width: 62px;
  height: 62px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: radial-gradient(circle at 50% 30%, color-mix(in oklab, var(--r) 20%, #fff), color-mix(in oklab, var(--r) 8%, #fff));
  box-shadow: inset 0 0 0 2px var(--r), 0 2px 5px rgba(0, 0, 0, .08);
}
.tcm__frame img { width: 92%; height: 92%; object-fit: contain; }
.tcm__fb { width: 50%; height: 50%; color: var(--ui-text-dimmed); }
.tcm__name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .74rem;
  color: var(--ui-text-highlighted);
  text-align: center;
  line-height: 1.05;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tcm__rarity { font-size: .62rem; font-weight: 800; color: var(--r); text-transform: uppercase; }
</style>
