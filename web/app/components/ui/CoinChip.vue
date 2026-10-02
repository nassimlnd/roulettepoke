<script setup lang="ts">
// Pastille dorée « pièce », affichée en ligne avant un montant.
// Source unique : auparavant recopiée (et divergente : 14 vs 15 px) dans
// play.vue et tournament.vue.
withDefaults(defineProps<{ size?: 'sm' | 'md' }>(), { size: 'md' })
</script>

<template>
  <span
    class="coin-chip"
    :class="`coin-chip--${size}`"
    aria-hidden="true"
  />
</template>

<style scoped>
.coin-chip {
  display: inline-block;
  border-radius: 50%;
  vertical-align: -2px;
  background: radial-gradient(circle at 35% 30%, var(--color-coin-light), var(--color-coin) 62%, var(--color-coin-deep));
  box-shadow: 0 0 6px color-mix(in srgb, var(--color-coin) 80%, transparent);
}
.coin-chip--sm { width: 14px; height: 14px; margin-right: 4px; }
.coin-chip--md { width: 15px; height: 15px; margin: 0 2px 0 4px; }
</style>
