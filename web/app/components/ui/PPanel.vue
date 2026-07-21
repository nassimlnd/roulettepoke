<script setup lang="ts">
// Surface « panneau » réutilisable (style Mochidex) : blanc, coins doux,
// ombre douce. Primitive de mise en page (Guide, paramètres, etc.).
</script>

<template>
  <section class="ppanel">
    <slot />
  </section>
</template>

<style scoped>
.ppanel {
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: 20px;
  padding: 20px 22px;
  box-shadow: 0 12px 28px -16px rgba(60, 40, 40, .18);
}
</style>
