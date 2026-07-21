<script setup lang="ts">
// Ligne de réglage : icône + intitulé + description à gauche, contrôle à droite
// (slot). Primitive de mise en page des panneaux Réglages.
defineProps<{ icon: string, title: string, description?: string }>()
</script>

<template>
  <div class="srow">
    <span class="srow__ico">
      <UIcon
        :name="icon"
        class="size-5"
      />
    </span>
    <div class="srow__text">
      <p class="srow__title">
        {{ title }}
      </p>
      <p
        v-if="description"
        class="srow__desc"
      >
        {{ description }}
      </p>
    </div>
    <div class="srow__control">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.srow {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 0;
}
.srow__ico {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 12px;
  color: var(--color-poke-600);
  background: var(--color-poke-50);
}
.srow__text { flex: 1; min-width: 0; }
.srow__title { font-family: var(--font-display); font-weight: 700; font-size: .95rem; color: var(--ui-text-highlighted); }
.srow__desc { font-size: .82rem; color: var(--ui-text-muted); margin-top: 2px; }
.srow__control { flex: none; display: flex; align-items: center; gap: 10px; }
@media (max-width: 520px) {
  .srow { flex-wrap: wrap; }
  .srow__control { width: 100%; padding-left: 52px; justify-content: flex-start; }
}
</style>
