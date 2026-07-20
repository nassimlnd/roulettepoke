<script setup lang="ts">
const props = defineProps<{ size?: 'sm' | 'md' }>()

const wallet = useWalletStore()
const source = computed(() => wallet.balance ?? 0)
const animated = useTransition(source, { duration: 400, transition: [0.33, 1, 0.68, 1] })
const display = computed(() => wallet.balance === null ? '—' : Math.round(animated.value).toLocaleString('fr-FR'))
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 font-display tabular text-secondary"
    :class="props.size === 'sm' ? 'text-sm' : 'text-base'"
    role="status"
    aria-live="polite"
    :aria-label="`${display} coins`"
  >
    <UIcon
      name="i-lucide-coins"
      class="size-4 shrink-0"
      aria-hidden="true"
    />
    <span>{{ display }}</span>
  </span>
</template>
