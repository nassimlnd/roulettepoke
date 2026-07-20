<script setup lang="ts">
// Navbar desktop : lit les stores, ne fetch jamais (résout C4). Sur mobile,
// la navigation passe par la BottomTabBar ; ici on garde le solde + la cloche.
const auth = useAuthStore()
const hub = useHubStore()

const links = [
  { label: 'Jouer', to: '/play', icon: 'i-lucide-dices' },
  { label: 'Collection', to: '/collection', icon: 'i-lucide-layout-grid' },
  { label: 'Équipe', to: '/team', icon: 'i-lucide-users' },
  { label: 'Arènes', to: '/gyms', icon: 'i-lucide-swords' },
  { label: 'Jackpot', to: '/slot-machine', icon: 'i-lucide-cherry' },
  { label: 'Classement', to: '/leaderboard', icon: 'i-lucide-trophy' },
  { label: 'Guide', to: '/rules', icon: 'i-lucide-book-open' }
]
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-default bg-muted/80 backdrop-blur">
    <div class="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
      <NuxtLink
        to="/play"
        class="flex items-center gap-2 font-display text-lg font-extrabold text-primary"
      >
        <UIcon
          name="i-lucide-dices"
          class="size-5"
        />
        <span class="hidden sm:inline">PokeRoulette</span>
      </NuxtLink>

      <nav
        class="hidden items-center gap-1 lg:flex"
        aria-label="Navigation principale"
      >
        <UButton
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          :label="l.label"
          variant="ghost"
          color="neutral"
          size="sm"
          active-class="text-primary"
        />
      </nav>

      <div class="ml-auto flex items-center gap-2">
        <CoinBalance />
        <UChip
          :show="hub.unreadNotifications > 0"
          :text="hub.unreadNotifications"
          size="2xl"
          color="error"
        >
          <UButton
            icon="i-lucide-bell"
            variant="ghost"
            color="neutral"
            aria-label="Notifications"
            @click="hub.markNotificationsRead()"
          />
        </UChip>
        <UButton
          icon="i-lucide-log-out"
          variant="ghost"
          color="neutral"
          aria-label="Déconnexion"
          class="hidden lg:inline-flex"
          @click="auth.logout()"
        />
      </div>
    </div>
  </header>
</template>
