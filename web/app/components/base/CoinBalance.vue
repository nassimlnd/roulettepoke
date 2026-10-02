<script setup lang="ts">
// Solde en pièces — pilule ambre « bonbon » (style Mochidex), compteur animé.
const props = defineProps<{ size?: 'sm' | 'md' }>()

const wallet = useWalletStore()
const source = computed(() => wallet.balance ?? 0)
const animated = useTransition(source, { duration: 400, transition: [0.33, 1, 0.68, 1] })
const display = computed(() => wallet.balance === null ? '—' : Math.round(animated.value).toLocaleString('fr-FR'))
</script>

<template>
  <span
    class="coins"
    :class="props.size === 'sm' ? 'coins--sm' : ''"
    role="status"
    aria-live="polite"
    :aria-label="`${display} pièces`"
  >
    <span
      class="coins__pip"
      aria-hidden="true"
    />
    <span class="coins__val tabular">{{ display }}</span>
  </span>
</template>

<style scoped>
.coins {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 13px 5px 6px;
  border-radius: 12px;
  background: linear-gradient(150deg, #fff2d6, #ffe0a0);
  border: 1.5px solid #f0d189;
  box-shadow: 0 2px 0 #e6bd63;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  color: #8a5a12;
  line-height: 1;
}
.coins--sm { font-size: .85rem; padding: 4px 10px 4px 5px; }
.coins__pip {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff, #f6c453 62%, #e0a92e);
  box-shadow: 0 0 6px rgba(246, 196, 83, .55), inset 0 -2px 0 rgba(0, 0, 0, .08);
  flex: none;
}
.coins--sm .coins__pip { width: 17px; height: 17px; }
</style>
