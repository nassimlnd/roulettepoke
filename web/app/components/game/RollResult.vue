<script setup lang="ts">
import type { RollOutcome, DomainCard } from '~/types/domain'

const props = defineProps<{
  outcome: RollOutcome
  // Quantité possédée APRÈS ce tirage (pour le doublon + pity estimé).
  quantity?: number
}>()

const { tierFor, isFullscreen } = useCelebration()

const card = computed<DomainCard | null>(() =>
  props.outcome.kind === 'card' ? props.outcome.card : null
)
const isNew = computed(() => props.outcome.kind === 'card' && props.outcome.isNew)
const tier = computed(() => (card.value ? tierFor(card.value) : 'common'))
const fullscreen = computed(() => card.value !== null && isFullscreen(tier.value))

// L'overlay plein écran s'ouvre à chaque nouveau résultat concerné.
const overlayOpen = ref(true)
watch(() => props.outcome, () => {
  overlayOpen.value = true
})

// Verbalisation nouveauté vs doublon + pity estimé (règle du Guide : +1/500).
const verbalization = computed(() => {
  if (!card.value) return ''
  if (isNew.value) return 'Nouvelle carte !'
  const q = props.quantity ?? 0
  const chance = Math.round(((q + 1) / 500) * 1000) / 10 // % à 1 décimale
  return `Doublon x${q} - chance shiny estimee ~${chance}%`
})
</script>

<template>
  <div>
    <!-- Résultat inline (dans la zone réservée, au-dessus du fold) -->
    <div
      class="flex flex-col items-center gap-2 text-center"
      role="status"
      aria-live="polite"
    >
      <template v-if="card">
        <p class="font-display text-sm uppercase tracking-wide text-muted">
          <template v-if="isNew">
            ✨ Nouvelle carte !
          </template>
          <template v-else>
            Tu as obtenu
          </template>
        </p>
        <GameCard
          :card="card"
          size="lg"
          :is-new="isNew"
        />
        <div class="flex flex-col items-center gap-0.5">
          <p class="font-display text-lg font-bold">
            {{ card.name }}
          </p>
          <RarityBadge
            :rarity="card.rarity"
            :shiny="card.isShiny"
          />
          <p class="text-xs text-muted">
            {{ verbalization }}
          </p>
        </div>
      </template>

      <template v-else-if="outcome.kind === 'coins'">
        <UIcon
          name="i-lucide-coins"
          class="size-10 text-secondary"
        />
        <p class="font-display text-xl font-bold text-secondary">
          +{{ outcome.amount }} coins
        </p>
        <p class="text-sm text-muted">
          Événement spécial !
        </p>
      </template>

      <template v-else-if="outcome.kind === 'charme'">
        <UIcon
          name="i-lucide-sparkles"
          class="size-10 text-primary"
        />
        <p class="font-display text-xl font-bold text-primary">
          Charme Chroma obtenu !
        </p>
        <p class="text-sm text-muted">
          Active-le pour doubler tes chances de shiny.
        </p>
      </template>
    </div>

    <!-- Célébration plein écran (niveaux 6-7 : légendaire / shiny) -->
    <Teleport to="body">
      <Transition name="celebrate">
        <div
          v-if="fullscreen && card && overlayOpen"
          class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-default/95 p-4 backdrop-blur"
          @click="overlayOpen = false"
        >
          <div
            class="phosphor-dots pointer-events-none absolute inset-0 opacity-30"
            aria-hidden="true"
          />
          <p class="font-display text-sm uppercase tracking-[0.2em] text-secondary">
            {{ card.isShiny ? '✦ Shiny ✦' : 'Légendaire !' }}
          </p>
          <div class="relative animate-[pop_0.5s_var(--ease-bounce)]">
            <GameCard
              :card="card"
              size="lg"
              :is-new="isNew"
            />
          </div>
          <p class="font-display text-2xl font-extrabold">
            {{ card.name }}
          </p>
          <UButton
            label="Continuer"
            size="lg"
            @click.stop="overlayOpen = false"
          />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
@keyframes pop {
  from { transform: scale(0.6); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.celebrate-enter-active, .celebrate-leave-active { transition: opacity 250ms var(--ease-snap); }
.celebrate-enter-from, .celebrate-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .animate-\[pop_0\.5s_var\(--ease-bounce\)\] { animation: none; }
}
</style>
