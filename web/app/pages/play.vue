<script setup lang="ts">
import type { RollOutcome } from '~/types/domain'
import { BASE_ROLL_COST } from '~/stores/roll'

const auth = useAuthStore()
const wallet = useWalletStore()
const prefs = usePreferencesStore()
const rollStore = useRollStore()
const collection = useCollectionStore()
const { celebrate, tierFor } = useCelebration()

const band = ref<{ spin: (w: unknown, p: unknown) => Promise<void>, reset: () => void } | null>(null)

const spinning = ref(false)
const lastOutcome = ref<RollOutcome | null>(null)
const lastQuantity = ref<number | undefined>()
const errorMsg = ref('')

// ─── Filtres ────────────────────────────────────────────────────────────────
const revealModes = [
  { value: 'visible', label: 'Visibles', icon: 'i-lucide-eye' },
  { value: 'smart', label: 'Si possédée', icon: 'i-lucide-sparkle' },
  { value: 'hidden', label: 'Masquées', icon: 'i-lucide-eye-off' }
] as const

const biomeItems = computed(() => [
  { label: 'Tous les biomes', value: '', cost: BASE_ROLL_COST },
  ...rollStore.biomes.map(b => ({ label: `${b.biome} (${b.ownedCount}/${b.cardCount})`, value: b.biome, cost: b.cost }))
])
const selectedBiome = computed({
  get: () => prefs.selectedBiome,
  set: v => (prefs.selectedBiome = v)
})
const currentCost = computed(() => rollStore.costForBiome(prefs.selectedBiome))

// ─── Tirage ───────────────────────────────────────────────────────────────────
async function spin() {
  if (spinning.value || !band.value) return
  if (!wallet.canAfford(currentCost.value)) {
    errorMsg.value = `Il te manque ${currentCost.value - (wallet.balance ?? 0)} coins. Gagne-en via l'entraînement, le jackpot ou le bonus quotidien.`
    return
  }
  errorMsg.value = ''
  spinning.value = true
  lastOutcome.value = null
  const biome = prefs.selectedBiome || null

  try {
    const [outcome, pool] = await Promise.all([
      rollStore.perform(biome, currentCost.value),
      rollStore.previewBatch(19, biome, null).catch(() => [])
    ])

    if (outcome.kind === 'card') {
      // Quantité après ce tirage (pour le doublon/pity).
      const existing = collection.cards.find(c => c.id === outcome.card.id)
      lastQuantity.value = outcome.isNew ? 1 : (existing?.quantity ?? 0) + 1
      await band.value.spin(outcome.card, pool)
      lastOutcome.value = outcome
      celebrate(tierFor(outcome.card))
      collection.invalidate()
      collection.ensureFresh(true).catch(() => {})
    } else if (outcome.kind === 'coins' || outcome.kind === 'charme') {
      // Événement spécial : révélation directe (pas de carte gagnante à centrer).
      band.value.reset()
      lastOutcome.value = outcome
    } else {
      // choice — résolu plus tard (v1 : révélation simple des deux options à venir).
      band.value.reset()
      lastOutcome.value = outcome
    }
    // Solde exact resynchronisé (le tirage a pu déclencher un événement coins).
    refreshBalance()
  } catch (err) {
    errorMsg.value = humanizeError(err)
    band.value?.reset()
  } finally {
    spinning.value = false
  }
}

async function refreshBalance() {
  try {
    const me = await authRepoMe()
    if (me) wallet.reconcile(me, 'roll-refresh')
  } catch { /* silencieux */ }
}
async function authRepoMe(): Promise<number | null> {
  const { user } = await useApi()<{ user: { coins: number } }>('/auth/me')
  return user?.coins ?? null
}

onMounted(() => {
  rollStore.ensureBiomes().catch(() => {})
  collection.ensureFresh().catch(() => {})
})
</script>

<template>
  <div class="space-y-5">
    <!-- Bandeau utilisateur -->
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <UAvatar
          :src="auth.user?.avatar_url || undefined"
          :alt="auth.user?.username"
          icon="i-lucide-user"
          size="sm"
        />
        <span class="font-medium">{{ auth.user?.username }}</span>
      </div>
      <CoinBalance />
    </div>

    <!-- Contrôles compacts : mode de révélation + biome -->
    <div class="flex flex-wrap items-center gap-2">
      <div
        class="flex rounded-lg border border-default p-0.5"
        role="group"
        aria-label="Mode de révélation"
      >
        <button
          v-for="m in revealModes"
          :key="m.value"
          class="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
          :class="prefs.revealMode === m.value ? 'bg-primary text-inverted' : 'text-muted hover:text-default'"
          :aria-pressed="prefs.revealMode === m.value"
          @click="prefs.revealMode = m.value"
        >
          <UIcon
            :name="m.icon"
            class="size-3.5"
          /> <span class="hidden sm:inline">{{ m.label }}</span>
        </button>
      </div>
      <USelectMenu
        v-model="selectedBiome"
        :items="biomeItems"
        value-key="value"
        label-key="label"
        icon="i-lucide-map"
        class="min-w-44"
        :search-input="false"
      />
    </div>

    <!-- Roulette -->
    <RouletteBand ref="band" />

    <!-- Action principale -->
    <div class="flex flex-col items-center gap-2">
      <UButton
        size="xl"
        :loading="spinning"
        :disabled="spinning"
        class="min-w-56 justify-center font-display text-base"
        @click="spin"
      >
        <UIcon
          name="i-lucide-dices"
          class="size-5"
        />
        Lancer&nbsp;<span class="tabular">({{ currentCost }}</span>
        <UIcon
          name="i-lucide-coins"
          class="size-4"
        />)
      </UButton>
      <p
        v-if="errorMsg"
        class="text-center text-sm text-error"
      >
        {{ errorMsg }}
      </p>
    </div>

    <!-- Zone de résultat RÉSERVÉE (au-dessus du fold — résout C1) -->
    <div class="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-default/60 p-4">
      <RollResult
        v-if="lastOutcome"
        :outcome="lastOutcome"
        :quantity="lastQuantity"
      />
      <p
        v-else
        class="text-sm text-dimmed"
      >
        Lance la roulette pour découvrir ta carte.
      </p>
    </div>

    <!-- Hub : Aujourd'hui / Cette semaine -->
    <HubPanel />
  </div>
</template>
