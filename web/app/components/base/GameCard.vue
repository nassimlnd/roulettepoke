<script setup lang="ts">
import type { DomainCard, DomainOwnedCard, RealRarity } from '~/types/domain'
import { typeSlug, biomeSlug } from '~/utils/poke'

const props = withDefaults(defineProps<{
  card: DomainCard | DomainOwnedCard
  size?: 'sm' | 'md' | 'lg'
  owned?: boolean // dos « ??? » si false
  quantity?: number
  isNew?: boolean
  revealed?: boolean
}>(), {
  size: 'md',
  owned: true,
  revealed: true
})

const dims = computed(() => ({
  sm: 'w-[88px]',
  md: 'w-[120px]',
  lg: 'w-[168px]'
}[props.size]))

const rarity = computed<RealRarity>(() => props.card.rarity)

// Bordure de rareté (2 px + halo unique) — commun = neutre.
const frameStyle = computed(() => {
  if (props.card.isShiny) {
    return { '--frame': 'var(--color-rarity-shiny)' }
  }
  const map: Record<RealRarity, string> = {
    Commun: 'transparent',
    Rare: 'var(--color-rarity-rare)',
    Épique: 'var(--color-rarity-epic)',
    Légendaire: 'var(--color-rarity-legendary)'
  }
  return { '--frame': map[rarity.value] }
})

const typeColor = computed(() => `var(--color-type-${typeSlug(props.card.type)})`)
const biomeColor = computed(() =>
  props.card.biome === 'Légendaire'
    ? 'var(--color-rarity-legendary)'
    : `var(--color-biome-${biomeSlug(props.card.biome)})`
)
</script>

<template>
  <div
    class="game-card group relative shrink-0 overflow-hidden rounded-xl border-2 bg-elevated transition-transform duration-150"
    :class="[dims, card.isShiny ? 'game-card--shiny' : '']"
    :style="frameStyle"
  >
    <!-- Face cachée (non possédée / non révélée) -->
    <template v-if="!owned || !revealed">
      <div class="phosphor-dots flex aspect-[3/4] flex-col items-center justify-center gap-1 opacity-70">
        <span class="font-display text-2xl text-dimmed">?</span>
      </div>
      <div class="px-2 py-1.5 text-center">
        <span
          class="inline-block rounded px-1.5 py-0.5 text-[0.6rem] font-medium text-default"
          :style="{ background: `color-mix(in oklab, ${biomeColor} 22%, transparent)` }"
        >{{ card.biome }}</span>
      </div>
    </template>

    <!-- Face révélée -->
    <template v-else>
      <div class="relative aspect-[3/4] bg-muted/40">
        <img
          :src="card.imageUrl"
          :alt="card.name"
          class="size-full object-contain p-2"
          loading="lazy"
          decoding="async"
        >
        <span
          v-if="card.isShiny"
          class="absolute right-1 top-1 text-rarity-shiny"
          aria-hidden="true"
        >✦</span>
        <span
          v-if="isNew"
          class="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[0.58rem] font-bold uppercase text-inverted"
        >Nouveau</span>
        <span
          v-if="quantity && quantity > 1"
          class="absolute bottom-1 right-1 rounded bg-default/80 px-1.5 py-0.5 text-[0.62rem] font-semibold tabular"
        >×{{ quantity }}</span>
      </div>
      <div class="space-y-0.5 px-2 py-1.5">
        <p class="truncate text-center text-[0.78rem] font-medium">
          {{ card.name }}
        </p>
        <div class="flex items-center justify-center gap-1.5">
          <span
            class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.6rem] font-medium"
            :style="{ color: typeColor, background: `color-mix(in oklab, ${typeColor} 16%, transparent)` }"
          >{{ card.type }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.game-card {
  border-color: color-mix(in oklab, var(--frame) 80%, var(--ui-border));
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--frame) 30%, transparent),
    0 0 20px -6px color-mix(in oklab, var(--frame) 50%, transparent);
}
.game-card--shiny {
  border-color: var(--color-rarity-shiny);
}
</style>
