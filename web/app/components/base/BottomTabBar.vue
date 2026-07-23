<script setup lang="ts">
// Navigation mobile au pouce : 4 destinations principales + un onglet « Menu »
// qui ouvre le tiroir complet (MobileMenu) donnant accès à TOUTES les sections.
// Masquée ≥ lg (la navbar prend le relais).
const route = useRoute()
const hub = useHubStore()

const menuOpen = ref(false)

const tabs = [
  { label: 'Jouer', to: '/play', icon: 'i-lucide-dices' },
  { label: 'Collection', to: '/collection', icon: 'i-lucide-layout-grid' },
  { label: 'Aventure', to: '/spin', icon: 'i-lucide-compass' },
  { label: 'Arènes', to: '/gyms', icon: 'i-lucide-swords' }
]

// L'onglet Menu s'allume quand le tiroir est ouvert OU quand la page courante
// n'est pas l'une des 4 destinations principales (l'utilisateur est « dans le Menu »).
const onPrimary = computed(() => tabs.some(t => route.path === t.to || route.path.startsWith(t.to + '/')))
const menuActive = computed(() => menuOpen.value || !onPrimary.value)
</script>

<template>
  <nav
    class="dock"
    aria-label="Navigation"
  >
    <ul class="dock__inner">
      <li
        v-for="t in tabs"
        :key="t.to"
        class="dock__item"
      >
        <NuxtLink
          :to="t.to"
          class="dock__tab"
          active-class="dock__tab--on"
        >
          <UIcon
            :name="t.icon"
            class="size-5"
          />
          <span class="dock__label">{{ t.label }}</span>
        </NuxtLink>
      </li>
      <li class="dock__item">
        <button
          type="button"
          class="dock__tab"
          :class="{ 'dock__tab--on': menuActive }"
          aria-label="Ouvrir le menu"
          @click="menuOpen = true"
        >
          <UChip
            :show="hub.tradeActionsRequired > 0"
            :text="hub.tradeActionsRequired"
            size="xl"
            color="error"
          >
            <UIcon
              name="i-lucide-menu"
              class="size-5"
            />
          </UChip>
          <span class="dock__label">Menu</span>
        </button>
      </li>
    </ul>

    <MobileMenu v-model:open="menuOpen" />
  </nav>
</template>

<style scoped>
.dock {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  z-index: 40;
  display: flex;
  justify-content: center;
  padding: 0 12px 12px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  pointer-events: none;
}
@media (min-width: 1024px) { .dock { display: none; } }
.dock__inner {
  pointer-events: auto;
  display: flex;
  width: 100%;
  max-width: 30rem;
  gap: 2px;
  padding: 6px;
  background: color-mix(in oklab, var(--ui-bg-elevated) 92%, transparent);
  backdrop-filter: blur(12px);
  border: 1px solid var(--ui-border);
  border-radius: 20px;
  box-shadow: 0 10px 28px -8px rgba(40, 30, 30, .28);
}
.dock__item { flex: 1; }
.dock__tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 100%;
  padding: 8px 4px;
  border-radius: 14px;
  color: var(--ui-text-muted);
  transition: color .15s ease, background .15s ease;
}
.dock__label {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: .66rem;
}
.dock__tab--on {
  color: #fff;
  background: linear-gradient(150deg, #ee5a48, var(--color-poke-500));
  box-shadow: 0 3px 0 var(--color-poke-700);
}
</style>
