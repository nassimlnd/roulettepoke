<script setup lang="ts">
// Menu de navigation mobile (tiroir plein écran) : donne accès à TOUTES les
// sections du jeu — la barre du bas n'en expose que 4. Ouvert depuis l'onglet
// « Menu » de la BottomTabBar. Se ferme à la navigation, au backdrop, à Échap.
import type { NavLink } from '~/config/navigation'
import { PRIMARY_LINKS, COMPETITION_LINKS, SECONDARY_LINKS } from '~/config/navigation'
import { generationRegion } from '~/constants/generation'

const open = defineModel<boolean>('open', { default: false })

const auth = useAuthStore()
const wallet = useWalletStore()
const hub = useHubStore()
const colorMode = useColorMode()

const coins = computed(() => wallet.balance ?? 0)
const region = computed(() => generationRegion(wallet.activeGeneration))
const isDark = computed(() => colorMode.value === 'dark')

interface MenuLink { to: string, icon: string, label: string, badge?: number }

// Les destinations viennent de la source unique (~/config/navigation) : c'est
// leur duplication ici qui avait laissé trois pages hors de la navbar desktop.
// Le tiroir ne garde que ce qui lui est propre — libellés plus explicites qu'en
// navbar (« Ouvrir un booster »), le badge, et Réglages.
const LABEL_OVERRIDES: Record<string, string> = {
  '/play': 'Ouvrir un booster',
  '/team': 'Mon équipe',
  '/stats': 'Statistiques'
}
const decorate = (links: readonly NavLink[]): MenuLink[] => links.map(l => ({
  to: l.to,
  icon: l.icon,
  label: LABEL_OVERRIDES[l.to] ?? l.label,
  ...(l.to === '/trades' ? { badge: hub.tradeActionsRequired } : {})
}))

const groups = computed<{ title: string, links: MenuLink[] }[]>(() => [
  { title: 'Jouer', links: decorate(PRIMARY_LINKS) },
  { title: 'Compétition', links: decorate(COMPETITION_LINKS) },
  {
    title: 'Plus',
    links: [
      ...decorate(SECONDARY_LINKS),
      { to: '/settings', icon: 'i-lucide-settings', label: 'Réglages' }
    ]
  }
])

function toggleTheme() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}
function onLogout() {
  open.value = false
  auth.logout()
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    title="Menu"
    :ui="{ content: 'max-w-[86vw] sm:max-w-sm' }"
  >
    <template #body>
      <div class="mm">
        <!-- Profil -->
        <NuxtLink
          to="/settings"
          class="mm__profile"
          @click="open = false"
        >
          <TourneyAvatar
            :src="auth.user?.avatar_url ?? null"
            :shiny="auth.user?.avatar_is_alt"
            :size="48"
            :alt="auth.user?.username ?? 'Profil'"
          />
          <div class="mm__id">
            <p class="mm__name font-display">
              {{ auth.user?.username ?? '—' }}
            </p>
            <p class="mm__coins tabular">
              <UIcon
                name="i-lucide-coins"
                class="size-4"
              />
              {{ coins.toLocaleString('fr-FR') }} pièces · {{ region }}
            </p>
          </div>
          <UIcon
            name="i-lucide-chevron-right"
            class="mm__chev size-5"
          />
        </NuxtLink>

        <!-- Sélecteur de région : hors du lien Profil, qui ne peut pas
             contenir un contrôle interactif. -->
        <div class="mm__gen">
          <GenerationSwitch />
        </div>

        <!-- Sections -->
        <nav class="mm__nav">
          <div
            v-for="g in groups"
            :key="g.title"
            class="mm__group"
          >
            <h3 class="mm__gtitle">
              {{ g.title }}
            </h3>
            <NuxtLink
              v-for="l in g.links"
              :key="l.to"
              :to="l.to"
              class="mm__link"
              active-class="mm__link--on"
              @click="open = false"
            >
              <span class="mm__ico">
                <UIcon
                  :name="l.icon"
                  class="size-5"
                />
              </span>
              <span class="mm__label">{{ l.label }}</span>
              <UChip
                v-if="l.badge"
                :text="l.badge"
                size="2xl"
                color="error"
                class="mm__badge"
              />
              <UIcon
                name="i-lucide-chevron-right"
                class="mm__arrow size-4"
              />
            </NuxtLink>
          </div>
        </nav>

        <!-- Pied : thème + déconnexion -->
        <div class="mm__foot">
          <button
            type="button"
            class="mm__foot-btn"
            @click="toggleTheme"
          >
            <UIcon
              :name="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
              class="size-5"
            />
            {{ isDark ? 'Mode clair' : 'Mode sombre' }}
          </button>
          <button
            type="button"
            class="mm__foot-btn mm__foot-btn--danger"
            @click="onLogout"
          >
            <UIcon
              name="i-lucide-log-out"
              class="size-5"
            />
            Déconnexion
          </button>
        </div>
      </div>
    </template>
  </USlideover>
</template>

<style scoped>
.mm { display: flex; flex-direction: column; gap: 16px; }

/* Profil */
.mm__profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
  transition: background .15s ease;
}
.mm__profile:active { background: var(--ui-bg-accented); }
.mm__id { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.mm__name { font-weight: 700; font-size: 1.05rem; color: var(--ui-text-highlighted); line-height: 1.1; }
.mm__gen { display: flex; justify-content: center; padding: 4px 0 2px; }
.mm__coins { display: inline-flex; align-items: center; gap: 5px; font-size: .82rem; font-weight: 700; color: var(--ui-text-muted); }
.mm__coins :deep(svg) { color: #d69828; }
.mm__chev { color: var(--ui-text-dimmed); flex: none; }

/* Sections */
.mm__nav { display: flex; flex-direction: column; gap: 14px; }
.mm__group { display: flex; flex-direction: column; gap: 3px; }
.mm__gtitle {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .72rem;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--ui-text-dimmed);
  padding: 0 4px 3px;
}
.mm__link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 13px;
  color: var(--ui-text);
  transition: background .14s ease, color .14s ease;
}
.mm__link:active { background: var(--ui-bg-muted); }
.mm__ico {
  flex: none;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  color: var(--ui-text-muted);
  background: var(--ui-bg-muted);
  transition: color .14s ease, background .14s ease;
}
.mm__label { flex: 1; font-family: var(--font-display); font-weight: 600; font-size: .98rem; }
.mm__arrow { color: var(--ui-text-dimmed); flex: none; }
.mm__badge { flex: none; margin-right: 2px; }

.mm__link--on { color: var(--color-poke-600); background: var(--color-poke-50); }
.mm__link--on .mm__ico {
  color: #fff;
  background: linear-gradient(150deg, #ee5a48, var(--color-poke-500));
  box-shadow: 0 2px 0 var(--color-poke-700);
}
.mm__link--on .mm__arrow { color: var(--color-poke-400); }

/* Pied */
.mm__foot { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; padding-top: 14px; border-top: 1px solid var(--ui-border); }
.mm__foot-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 12px;
  border-radius: 13px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: .94rem;
  color: var(--ui-text);
  background: var(--ui-bg-muted);
  transition: background .14s ease;
}
.mm__foot-btn:active { background: var(--ui-bg-accented); }
.mm__foot-btn--danger { color: var(--color-poke-600); }
</style>
