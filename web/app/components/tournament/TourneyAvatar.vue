<script setup lang="ts">
// Avatar compact (sprite de la carte-avatar) — participants, matchups, résultats.
withDefaults(defineProps<{ src: string | null, shiny?: boolean, size?: number, alt?: string }>(), {
  size: 40,
  shiny: false,
  alt: ''
})
</script>

<template>
  <span
    class="tav"
    :class="{ 'tav--shiny': shiny }"
    :style="{ '--s': size + 'px' }"
  >
    <img
      v-if="src"
      :src="src"
      :alt="alt"
      loading="lazy"
    >
    <UIcon
      v-else
      name="i-lucide-user"
      class="tav__fb"
    />
  </span>
</template>

<style scoped>
.tav {
  display: inline-grid;
  place-items: center;
  width: var(--s);
  height: var(--s);
  border-radius: 50%;
  overflow: hidden;
  flex: none;
  background: var(--ui-bg-muted);
  box-shadow: 0 0 0 2px var(--ui-bg-elevated), 0 0 0 3px var(--ui-border-accented);
}
.tav--shiny { box-shadow: 0 0 0 2px var(--ui-bg-elevated), 0 0 0 3px #c9b3ff, 0 0 8px rgba(201, 179, 255, .6); }
.tav img { width: 100%; height: 100%; object-fit: cover; }
.tav__fb { width: 55%; height: 55%; color: var(--ui-text-dimmed); }
</style>
