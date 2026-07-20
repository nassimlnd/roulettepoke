<script setup lang="ts">
// Hub « Aujourd'hui / Cette semaine » — alimenté par le store hub (données déjà
// récupérées, aucun fetch supplémentaire par navigation).
const hub = useHubStore()

onMounted(() => {
  hub.ensureLong().catch(() => {})
})
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <section aria-labelledby="hub-today">
      <h2
        id="hub-today"
        class="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted"
      >
        <UIcon
          name="i-lucide-sun"
          class="size-4"
        /> Aujourd'hui
      </h2>
      <ul class="space-y-1.5">
        <li
          v-for="t in hub.dailyTiles"
          :key="t.key"
        >
          <NuxtLink
            :to="t.to"
            class="flex items-center gap-3 rounded-lg border border-default bg-elevated px-3 py-2.5 transition-colors hover:border-accented"
          >
            <UIcon
              :name="t.available ? 'i-lucide-circle-dot' : 'i-lucide-circle-check'"
              class="size-4 shrink-0"
              :class="t.available ? 'text-primary' : 'text-dimmed'"
            />
            <span class="flex-1 text-sm font-medium">{{ t.label }}</span>
            <span
              v-if="t.available"
              class="text-xs font-semibold text-primary"
            >Disponible</span>
            <CountdownChip
              v-else
              :target="t.nextResetAt"
            />
          </NuxtLink>
        </li>
      </ul>
    </section>

    <section aria-labelledby="hub-week">
      <h2
        id="hub-week"
        class="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted"
      >
        <UIcon
          name="i-lucide-calendar-days"
          class="size-4"
        /> Cette semaine
      </h2>
      <ul class="space-y-1.5">
        <li
          v-for="t in hub.weeklyTiles"
          :key="t.key"
        >
          <NuxtLink
            :to="t.to"
            class="flex items-center gap-3 rounded-lg border border-default bg-elevated px-3 py-2.5 transition-colors hover:border-accented"
          >
            <UIcon
              :name="t.available ? 'i-lucide-circle-dot' : 'i-lucide-lock'"
              class="size-4 shrink-0"
              :class="t.available ? 'text-primary' : 'text-dimmed'"
            />
            <span class="flex-1 text-sm font-medium">{{ t.label }}</span>
            <span
              v-if="t.available"
              class="text-xs font-semibold text-primary"
            >À jouer</span>
            <CountdownChip
              v-else
              :target="t.nextResetAt"
            />
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
