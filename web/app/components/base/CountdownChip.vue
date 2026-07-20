<script setup lang="ts">
import { useNow } from '@vueuse/core'

const props = defineProps<{ target: Date | null }>()

const now = useNow({ interval: 1000 })

const label = computed(() => {
  if (!props.target) return ''
  const ms = props.target.getTime() - now.value.getTime()
  if (ms <= 0) return 'maintenant'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `dans ${d} j ${h} h`
  if (h > 0) return `dans ${h} h ${m} min`
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
})
</script>

<template>
  <span class="tabular text-xs text-dimmed">{{ label }}</span>
</template>
