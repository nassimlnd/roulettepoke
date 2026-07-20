<script setup lang="ts">
import type { RealRarity } from '~/types/domain'

const props = defineProps<{ rarity: RealRarity, shiny?: boolean }>()

// Information jamais portée par la seule couleur : la rareté est aussi un texte.
const label = computed(() => props.shiny ? 'Shiny' : props.rarity)
const cls = computed(() => {
  if (props.shiny) return 'text-rarity-shiny'
  return {
    Commun: 'text-dimmed',
    Rare: 'text-rarity-rare',
    Épique: 'text-rarity-epic',
    Légendaire: 'text-rarity-legendary'
  }[props.rarity]
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1 text-[0.68rem] font-semibold uppercase tracking-wide"
    :class="cls"
  >
    <UIcon
      v-if="shiny"
      name="i-lucide-sparkles"
      class="size-3"
      aria-hidden="true"
    />
    {{ label }}
  </span>
</template>
