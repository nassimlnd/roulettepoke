<script setup lang="ts">
// Navbar desktop : lit les stores, ne fetch jamais (résout C4). Style « jeu » :
// marque Poké Ball, navigation en pilules (actif rouge), solde + cloche.
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
  <header class="navbar">
    <div class="navbar__inner">
      <NuxtLink
        to="/play"
        class="brand"
      >
        <PokeBall :size="30" />
        <span class="brand__name">Poké<span class="brand__accent">Roulette</span></span>
      </NuxtLink>

      <nav
        class="nav"
        aria-label="Navigation principale"
      >
        <NuxtLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="nav__link"
          active-class="nav__link--on"
        >
          <UIcon
            :name="l.icon"
            class="size-4"
          />
          <span>{{ l.label }}</span>
        </NuxtLink>
      </nav>

      <div class="navbar__right">
        <CoinBalance size="sm" />
        <UChip
          :show="hub.unreadNotifications > 0"
          :text="hub.unreadNotifications"
          size="2xl"
          color="error"
        >
          <button
            class="icon-btn"
            aria-label="Notifications"
            @click="hub.markNotificationsRead()"
          >
            <UIcon
              name="i-lucide-bell"
              class="size-5"
            />
          </button>
        </UChip>
        <NuxtLink
          to="/settings"
          class="avatar-link"
          active-class="avatar-link--on"
          aria-label="Profil et réglages"
        >
          <TourneyAvatar
            :src="auth.user?.avatar_url ?? null"
            :shiny="auth.user?.avatar_is_alt"
            :size="34"
            :alt="auth.user?.username ?? 'Profil'"
          />
        </NuxtLink>
      </div>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 40;
  background: color-mix(in oklab, var(--ui-bg-elevated) 88%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--ui-border);
}
.navbar__inner {
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: 80rem;
  margin: 0 auto;
  height: 60px;
  padding: 0 20px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: none;
}
.brand__name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.15rem;
  color: var(--ui-text-highlighted);
  letter-spacing: -.02em;
}
.brand__accent { color: var(--color-poke-500); }

.nav {
  display: none;
  align-items: center;
  gap: 3px;
}
@media (min-width: 1024px) { .nav { display: flex; } }
.nav__link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: 11px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: .88rem;
  color: var(--ui-text-muted);
  transition: color .15s ease, background .15s ease;
}
.nav__link:hover { color: var(--ui-text); background: var(--ui-bg-muted); }
.nav__link--on {
  color: #fff;
  background: linear-gradient(150deg, #ee5a48, var(--color-poke-500));
  box-shadow: 0 2px 0 var(--color-poke-700);
}
.nav__link--on:hover { color: #fff; background: linear-gradient(150deg, #ee5a48, var(--color-poke-500)); }

.navbar__right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.icon-btn {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  color: var(--ui-text-muted);
  transition: color .15s ease, background .15s ease;
}
.icon-btn:hover { color: var(--ui-text); background: var(--ui-bg-muted); }

.avatar-link {
  display: grid;
  place-items: center;
  border-radius: 50%;
  transition: transform .15s var(--ease-pop);
}
.avatar-link:hover { transform: translateY(-1px); }
.avatar-link:focus-visible { outline: 2px solid var(--color-poke-400); outline-offset: 2px; }
.avatar-link--on :deep(.tav) {
  box-shadow: 0 0 0 2px var(--ui-bg-elevated), 0 0 0 3px var(--color-poke-500);
}
</style>
