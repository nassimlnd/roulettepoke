<script setup lang="ts">
// Navbar desktop : lit les stores, ne fetch jamais (résout C4). Style « jeu » :
// marque Poké Ball, navigation en pilules (actif rouge), solde + cloche.
import { PRIMARY_LINKS, COMPETITION_LINKS, SECONDARY_LINKS } from '~/config/navigation'

const auth = useAuthStore()
const hub = useHubStore()

const route = useRoute()

// « Compétition » est un regroupement, pas une page : il s'allume dès qu'on est
// sur l'une de ses destinations, sinon le joueur perd tout repère de position.
const competitionActive = computed(() =>
  COMPETITION_LINKS.some(l => route.path.startsWith(l.to)))

// Un échange en attente de réponse doit se voir depuis n'importe quelle page —
// il était jusqu'ici signalé uniquement dans le menu mobile.
const competitionBadge = computed(() => hub.tradeActionsRequired)

// Items du menu déroulant. On passe par UDropdownMenu (et non un UPopover
// maison) : il fournit la navigation aux flèches, la fermeture par Échap et le
// déplacement du focus DANS le menu. Une version précédente ouvrait bien le
// menu au focus, mais Tab sautait par-dessus son contenu — les cinq
// destinations restaient donc inatteignables au clavier.
const competitionItems = computed(() => COMPETITION_LINKS.map(l => ({
  label: l.to === '/trades' && competitionBadge.value
    ? `${l.label} (${competitionBadge.value})`
    : l.label,
  icon: l.icon,
  to: l.to
})))
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
          v-for="l in PRIMARY_LINKS"
          :key="l.to"
          :to="l.to"
          class="nav__link"
          active-class="nav__link--on"
          :title="l.label"
        >
          <UIcon
            :name="l.icon"
            class="size-4"
          />
          <span class="nav__label">{{ l.label }}</span>
        </NuxtLink>

        <!-- Compétition : regroupe Arènes, Ligue, Tournoi, Classement, Échanges.
             Ces trois dernières n'étaient atteignables par AUCUNE navigation
             desktop avant ce regroupement. -->
        <UDropdownMenu
          :items="competitionItems"
          :content="{ align: 'center', sideOffset: 6 }"
          :ui="{ content: 'min-w-48' }"
        >
          <button
            type="button"
            class="nav__link nav__group"
            :class="{ 'nav__link--on': competitionActive }"
          >
            <UIcon
              name="i-lucide-swords"
              class="size-4"
            />
            <span class="nav__label">Compétition</span>
            <span
              v-if="competitionBadge"
              class="nav__dot"
              :title="`${competitionBadge} échange(s) à traiter`"
            />
            <UIcon
              name="i-lucide-chevron-down"
              class="size-3 nav__caret"
            />
          </button>
        </UDropdownMenu>

        <NuxtLink
          v-for="l in SECONDARY_LINKS"
          :key="l.to"
          :to="l.to"
          class="nav__link"
          active-class="nav__link--on"
          :title="l.label"
        >
          <UIcon
            :name="l.icon"
            class="size-4"
          />
          <span class="nav__label">{{ l.label }}</span>
        </NuxtLink>
      </nav>

      <div class="navbar__right">
        <CoinBalance size="sm" />
        <ThemeToggle />
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
  gap: 2px;
}
@media (min-width: 1024px) { .nav { display: flex; } }
.nav__link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px;
  border-radius: 11px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: .84rem;
  color: var(--ui-text-muted);
  white-space: nowrap;
  transition: color .15s ease, background .15s ease;
}
/* 1024-1279 (iPad paysage, laptops étroits) : icônes seules pour tout faire tenir. */
.nav__label { display: none; }
/* Dès qu'on a la place (≥ 1280) : libellés + un peu plus d'air. */
@media (min-width: 1280px) {
  .nav { gap: 3px; }
  .nav__link { gap: 6px; padding: 7px 12px; font-size: .88rem; }
  .nav__label { display: inline; }
}
.nav__link:hover { color: var(--ui-text); background: var(--ui-bg-muted); }
.nav__link--on {
  color: #fff;
  background: linear-gradient(150deg, #ee5a48, var(--color-poke-500));
  box-shadow: 0 2px 0 var(--color-poke-700);
}
.nav__link--on:hover { color: #fff; background: linear-gradient(150deg, #ee5a48, var(--color-poke-500)); }

/* Regroupement « Compétition » : même pilule que les liens, plus un chevron. */
.nav__group { border: none; cursor: pointer; font: inherit; }
.nav__caret { opacity: .6; margin-left: -2px; }
.nav__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-poke-500);
  flex: none;
}
.nav__link--on .nav__dot { background: #fff; }

/* Le contenu du menu est rendu par UDropdownMenu : plus de styles maison à
   maintenir ici (l'ancien bloc .grp* dupliquait ce que le DS fournit). */

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
