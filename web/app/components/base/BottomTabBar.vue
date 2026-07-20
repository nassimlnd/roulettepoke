<script setup lang="ts">
// Navigation mobile atteignable au pouce : 5 onglets (19 routes → Jouer /
// Collection / Défis / Social / Plus). Masquée ≥ lg (navbar top prend le relais).
const hub = useHubStore()

const tabs = computed(() => [
  { label: 'Jouer', to: '/play', icon: 'i-lucide-dices', badge: 0 },
  { label: 'Collection', to: '/collection', icon: 'i-lucide-layout-grid', badge: 0 },
  { label: 'Défis', to: '/gyms', icon: 'i-lucide-swords', badge: 0 },
  { label: 'Social', to: '/leaderboard', icon: 'i-lucide-trophy', badge: hub.tradeActionsRequired },
  { label: 'Plus', to: '/rules', icon: 'i-lucide-menu', badge: 0 }
])
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 border-t border-default bg-muted/90 backdrop-blur lg:hidden"
    style="padding-bottom: env(safe-area-inset-bottom)"
    aria-label="Navigation"
  >
    <ul class="mx-auto flex max-w-lg items-stretch">
      <li
        v-for="t in tabs"
        :key="t.to"
        class="flex-1"
      >
        <NuxtLink
          :to="t.to"
          class="relative flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-dimmed transition-colors"
          active-class="!text-primary"
        >
          <UChip
            :show="t.badge > 0"
            :text="t.badge"
            size="xl"
            color="error"
          >
            <UIcon
              :name="t.icon"
              class="size-5"
            />
          </UChip>
          <span class="text-[0.68rem] font-medium">{{ t.label }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
