<script setup lang="ts">
import type { DomainCard } from '~/types/domain'
import type { RevealMode } from '~/stores/preferences'
import { authRepo } from '~/repositories'

// Page Réglages — profil (avatar, identité, stats), préférences de jeu (son,
// animations), et compte (réinitialisation du mot de passe, déconnexion).
const auth = useAuthStore()
const wallet = useWalletStore()
const prefs = usePreferencesStore()
const sound = useSound()
const toast = useToast()
const colorMode = useColorMode()

// ─── Apparence (thème clair / sombre / système) ───────────────────────────────
const THEME_OPTS = [
  { value: 'system', label: 'Système', hint: 'Suit ton appareil' },
  { value: 'light', label: 'Clair', hint: 'Toujours clair' },
  { value: 'dark', label: 'Sombre', hint: 'Toujours sombre' }
] as const

const user = computed(() => auth.user)
const coins = computed(() => wallet.balance ?? user.value?.coins ?? 0)
const charme = computed(() => user.value?.charme_chroma_rolls ?? 0)

// ─── Avatar ─────────────────────────────────────────────────────────────────
const avatarOpen = ref(false)
const { pending: savingAvatar, run: runAvatar } = useAsyncAction()
const loadAvatarCards = (): Promise<DomainCard[]> => authRepo.avatarCards(useApi())

function onPickAvatar(card: DomainCard) {
  return runAvatar(async () => {
    await auth.setAvatar(card.id)
    toast.add({ title: 'Avatar mis à jour !', color: 'success', icon: 'i-lucide-check' })
    avatarOpen.value = false
  })
}

// ─── Son ────────────────────────────────────────────────────────────────────
const soundOn = computed({
  get: () => !prefs.muted,
  set: (v: boolean) => {
    prefs.muted = !v
    if (v) sound.tick()
  }
})
const volumePct = computed({
  get: () => Math.round(prefs.volume * 100),
  set: (v: number) => { prefs.volume = Math.min(1, Math.max(0, v / 100)) }
})
function testSound() {
  sound.resume()
  sound.coin()
}

// ─── Animations ───────────────────────────────────────────────────────────────
const MOTION_OPTS = [
  { value: 'auto', label: 'Auto', hint: 'Suit ton système' },
  { value: 'off', label: 'Activées', hint: 'Toujours animer' },
  { value: 'on', label: 'Réduites', hint: 'Moins de mouvement' }
] as const

// ─── Révélation des tirages ───────────────────────────────────────────────────
const REVEAL_OPTS: { value: RevealMode, label: string, hint: string }[] = [
  { value: 'visible', label: 'Complète', hint: 'Animation entière (~3 s)' },
  { value: 'smart', label: 'Rapide', hint: 'Version accélérée' },
  { value: 'hidden', label: 'Directe', hint: 'Résultat immédiat' }
]

// ─── Mot de passe ─────────────────────────────────────────────────────────────
const { pending: sendingReset, run: runReset } = useAsyncAction()
function sendReset() {
  if (!user.value) return
  const email = user.value.email
  return runReset(async () => {
    await authRepo.forgotPassword(useApi(), email)
    toast.add({
      title: 'Lien envoyé',
      description: `Un e-mail de réinitialisation part vers ${email}.`,
      color: 'success',
      icon: 'i-lucide-mail'
    })
  })
}
</script>

<template>
  <div class="set">
    <header class="set__head">
      <h1 class="set__title font-display">
        Réglages
      </h1>
      <p class="set__lead">
        Ton profil, tes préférences de jeu et ton compte.
      </p>
    </header>

    <!-- Profil -->
    <PPanel class="prof">
      <div class="prof__id">
        <button
          class="prof__avatar"
          aria-label="Changer d'avatar"
          @click="avatarOpen = true"
        >
          <TourneyAvatar
            :src="user?.avatar_url ?? null"
            :shiny="user?.avatar_is_alt"
            :size="76"
            :alt="user?.username ?? ''"
          />
          <span class="prof__edit">
            <UIcon
              name="i-lucide-pencil"
              class="size-3.5"
            />
          </span>
        </button>
        <div class="prof__meta">
          <p class="prof__name font-display">
            {{ user?.username ?? '—' }}
          </p>
          <p class="prof__mail">
            <UIcon
              name="i-lucide-mail"
              class="size-4"
            />
            {{ user?.email ?? '' }}
          </p>
          <PButton
            color="neutral"
            class="prof__btn"
            @click="avatarOpen = true"
          >
            <UIcon
              name="i-lucide-image"
              class="size-4"
            /> Changer l'avatar
          </PButton>
        </div>
      </div>

      <div class="prof__stats">
        <div class="stat">
          <span class="stat__ico stat__ico--coin">
            <UIcon
              name="i-lucide-coins"
              class="size-4"
            />
          </span>
          <span class="stat__val tabular">{{ coins.toLocaleString('fr-FR') }}</span>
          <span class="stat__lbl">Pièces</span>
        </div>
        <div
          v-if="charme > 0"
          class="stat"
        >
          <span class="stat__ico stat__ico--charme">
            <UIcon
              name="i-lucide-sparkles"
              class="size-4"
            />
          </span>
          <span class="stat__val tabular">{{ charme }}</span>
          <span class="stat__lbl">Charme Chroma</span>
        </div>
      </div>
    </PPanel>

    <!-- Préférences -->
    <PPanel>
      <h2 class="sect font-display">
        Préférences
      </h2>

      <SettingRow
        icon="i-lucide-moon"
        title="Apparence"
        description="Thème clair ou sombre de l'interface."
      >
        <PSegmented
          v-model="colorMode.preference"
          :options="THEME_OPTS"
          size="sm"
          tone="accent"
          a11y="radio"
          aria-label="Thème de l'interface"
        />
      </SettingRow>

      <div class="sep" />

      <SettingRow
        icon="i-lucide-volume-2"
        title="Son"
        description="Effets sonores et fanfares du jeu."
      >
        <button
          class="ghost"
          :disabled="!soundOn"
          aria-label="Tester le son"
          @click="testSound"
        >
          <UIcon
            name="i-lucide-play"
            class="size-4"
          />
        </button>
        <USwitch v-model="soundOn" />
      </SettingRow>

      <SettingRow
        v-if="soundOn"
        icon="i-lucide-sliders-horizontal"
        title="Volume"
        :description="`${volumePct}%`"
      >
        <input
          v-model.number="volumePct"
          class="range"
          type="range"
          min="0"
          max="100"
          step="5"
          aria-label="Volume"
          @change="sound.tick()"
        >
      </SettingRow>

      <div class="sep" />

      <SettingRow
        icon="i-lucide-sparkles"
        title="Animations"
        description="Transitions, roulette et célébrations."
      >
        <PSegmented
          v-model="prefs.reducedMotionOverride"
          :options="MOTION_OPTS"
          size="sm"
          tone="accent"
          a11y="radio"
          aria-label="Niveau d'animation"
        />
      </SettingRow>

      <div class="sep" />

      <SettingRow
        icon="i-lucide-wand-sparkles"
        title="Révélation des tirages"
        description="Rythme de l'ouverture des boosters."
      >
        <PSegmented
          v-model="prefs.revealMode"
          :options="REVEAL_OPTS"
          size="sm"
          tone="accent"
          a11y="radio"
          aria-label="Rythme de révélation"
        />
      </SettingRow>

      <div class="sep" />

      <!-- Le sélecteur est large (une tuile d'aperçu par style) : il occupe sa
           propre ligne au lieu d'être tassé à droite d'un SettingRow. -->
      <div class="sprites">
        <div class="sprites__head">
          <span class="sprites__ico">
            <UIcon
              name="i-lucide-image"
              class="size-4"
            />
          </span>
          <div>
            <p class="sprites__title">
              Style des sprites
            </p>
            <p class="sprites__desc">
              Le rendu des Pokémon sur tes cartes, d'une génération à l'autre.
              Clique un aperçu pour l'adopter.
            </p>
          </div>
        </div>
        <SpriteStylePicker v-model="prefs.spriteStyle" />
      </div>
    </PPanel>

    <!-- Compte -->
    <PPanel>
      <h2 class="sect font-display">
        Compte
      </h2>

      <SettingRow
        icon="i-lucide-key-round"
        title="Mot de passe"
        description="Reçois un lien de réinitialisation par e-mail."
      >
        <PButton
          color="neutral"
          :loading="sendingReset"
          @click="sendReset"
        >
          Envoyer le lien
        </PButton>
      </SettingRow>

      <div class="sep" />

      <SettingRow
        icon="i-lucide-log-out"
        title="Déconnexion"
        description="Ferme ta session sur cet appareil."
      >
        <PButton
          color="error"
          @click="auth.logout()"
        >
          <UIcon
            name="i-lucide-log-out"
            class="size-4"
          /> Se déconnecter
        </PButton>
      </SettingRow>
    </PPanel>

    <AvatarPicker
      v-model:open="avatarOpen"
      :load="loadAvatarCards"
      :current-url="user?.avatar_url ?? null"
      :busy="savingAvatar"
      @pick="onPickAvatar"
    />
  </div>
</template>

<style scoped>
.set { display: flex; flex-direction: column; gap: 16px; max-width: 46rem; }
.set__title { font-weight: 700; font-size: 1.7rem; margin: 0; }
.set__lead { font-weight: 600; font-size: .9rem; color: var(--ui-text-muted); margin: 4px 0 0; }

/* Profil */
.prof { display: flex; flex-direction: column; gap: 18px; }
.prof__id { display: flex; align-items: center; gap: 18px; }
.prof__avatar { position: relative; flex: none; border: none; background: none; cursor: pointer; border-radius: 50%; }
.prof__avatar:focus-visible { outline: 2px solid var(--color-poke-400); outline-offset: 3px; }
.prof__edit {
  position: absolute;
  right: -2px;
  bottom: -2px;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  color: #fff;
  background: var(--color-poke-500);
  box-shadow: 0 2px 0 var(--color-poke-700), 0 0 0 3px var(--ui-bg-elevated);
}
.prof__meta { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.prof__name { font-weight: 700; font-size: 1.35rem; color: var(--ui-text-highlighted); line-height: 1.1; }
.prof__mail { display: inline-flex; align-items: center; gap: 6px; font-size: .86rem; color: var(--ui-text-muted); }
.prof__mail :deep(svg) { color: var(--ui-text-dimmed); }
.prof__btn { align-self: flex-start; margin-top: 3px; }

.prof__stats { display: flex; gap: 12px; flex-wrap: wrap; }
.stat {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 14px;
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
}
.stat__ico { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; }
.stat__ico--coin { color: #b7791f; background: color-mix(in oklab, #f6c453 26%, transparent); }
.stat__ico--charme { color: #a684ff; background: color-mix(in oklab, #c9b3ff 26%, transparent); }
.stat__val { font-family: var(--font-display); font-weight: 800; font-size: 1.05rem; color: var(--ui-text-highlighted); }
.stat__lbl { font-size: .8rem; font-weight: 600; color: var(--ui-text-muted); }

/* Sections */
.sect { font-weight: 700; font-size: 1.1rem; margin-bottom: 2px; }
.sep { height: 1px; background: var(--ui-border); }

.sprites { display: flex; flex-direction: column; gap: 12px; }
.sprites__head { display: flex; align-items: flex-start; gap: 12px; }
.sprites__ico {
  display: grid;
  place-items: center;
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 11px;
  color: var(--color-poke-600);
  background: var(--color-poke-50);
}
.sprites__title { font-weight: 700; font-size: .95rem; color: var(--ui-text-highlighted); }
.sprites__desc { font-size: .84rem; color: var(--ui-text-muted); margin-top: 2px; }

/* Contrôles */
.ghost {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: var(--ui-text-muted);
  background: var(--ui-bg-muted);
  transition: color .15s ease, background .15s ease;
}
.ghost:hover:not(:disabled) { color: var(--color-poke-600); background: var(--color-poke-50); }
.ghost:disabled { opacity: .4; cursor: default; }

.range {
  width: 160px;
  max-width: 46vw;
  accent-color: var(--color-poke-500);
  cursor: pointer;
}
</style>
