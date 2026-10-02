<script setup lang="ts">
import type { LeagueLegendary } from '~/types/domain'

// Bandeau des légendaires « en jeu » : ce que l'on peut tenter de capturer en
// remportant la Ligue. Décoratif (aperçu), sauf si `pickable` (choix de reward).
defineProps<{
  legendaries: LeagueLegendary[]
  pickable?: boolean
  busy?: boolean
}>()
const emit = defineEmits<{ pick: [legendary: LeagueLegendary] }>()
</script>

<template>
  <div class="strip">
    <component
      :is="pickable ? 'button' : 'div'"
      v-for="l in legendaries"
      :key="l.id"
      class="leg"
      :class="{ 'leg--pick': pickable }"
      :disabled="pickable && busy ? true : undefined"
      @click="pickable && emit('pick', l)"
    >
      <span class="leg__frame">
        <img
          :src="l.imageUrl"
          :alt="l.name"
          loading="lazy"
        >
      </span>
      <span class="leg__name">{{ l.name }}</span>
    </component>
  </div>
</template>

<style scoped>
.strip { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
@media (max-width: 560px) { .strip { grid-template-columns: repeat(3, 1fr); } }
.leg {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 8px 4px;
  border: none;
  background: none;
  border-radius: 14px;
}
.leg--pick {
  cursor: pointer;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  transition: transform .15s var(--ease-pop), border-color .15s ease;
}
.leg--pick:hover:not(:disabled) { transform: translateY(-3px); border-color: #e0a92e; }
.leg--pick:disabled { opacity: .5; cursor: default; }
.leg--pick:focus-visible { outline: 2px solid #e0a92e; outline-offset: 2px; }
.leg__frame {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: radial-gradient(circle at 50% 30%, color-mix(in oklab, #f6c453 26%, #fff), color-mix(in oklab, #f6c453 8%, #fff));
  box-shadow: 0 0 0 2px var(--ui-bg-elevated), 0 0 0 3px #e0a92e;
}
.leg__frame img { width: 90%; height: 90%; object-fit: contain; }
.leg__name { font-family: var(--font-display); font-weight: 700; font-size: .74rem; color: var(--ui-text-toned); text-align: center; }
</style>
