<script setup lang="ts">
// Layout du jeu : navbar (desktop) + bottom tab bar (mobile). Monte les données
// « fraîches » de la navbar UNE fois (TTL ensuite → zéro fetch par navigation).
const hub = useHubStore()
const events = useEventsStore()

onMounted(() => {
  hub.ensureShort().catch(() => {})
  events.ensureFresh().catch(() => {})
})
</script>

<template>
  <div class="min-h-dvh bg-default text-default">
    <AppNavbar />
    <!-- Événements du jour : révélés le jour même, juste sous la navbar. -->
    <EventsStrip />
    <main class="mx-auto max-w-6xl px-4 pb-24 pt-4 lg:pb-10">
      <slot />
    </main>
    <BottomTabBar />
    <ChatWidget />
    <BattleStage />
  </div>
</template>
