<script setup lang="ts">
import type { DomainCard } from '~/types/domain'

// Révélation post-ouverture (direction Mochidex) : burst doré + carte qui
// « émerge ». Gère la carte, les événements pièces / charme, et le choix
// interactif (event card-choice) où l'on retient une carte sur deux.
export type RevealView
  = | { kind: 'card', card: DomainCard, isNew: boolean, quantity?: number }
    | { kind: 'coins', amount: number }
    | { kind: 'charme' }
    | { kind: 'choice', left: DomainCard, right: DomainCard, resolving: boolean }

const props = defineProps<{ view: RevealView }>()
const emit = defineEmits<{ pick: [card: DomainCard], finish: [] }>()

const isBig = (c: DomainCard) => c.isShiny || c.rarity === 'Épique' || c.rarity === 'Légendaire'

const title = computed(() => {
  switch (props.view.kind) {
    case 'card': return props.view.isNew ? 'Nouvelle carte ! ✦' : 'Tu as obtenu :'
    case 'coins': return 'Événement spécial !'
    case 'charme': return 'Charme Chroma !'
    case 'choice': return 'Choisis ta carte ✦'
  }
  return ''
})
const sub = computed(() => {
  const v = props.view
  switch (v.kind) {
    case 'card': return `${v.card.isShiny ? 'Shiny · ' : ''}${v.card.rarity} · ${v.card.type}`
    case 'coins': return 'Une pluie de pièces tombe du paquet'
    case 'charme': return 'Tes chances de shiny sont doublées'
    case 'choice': return 'Une seule des deux rejoint ta collection'
  }
  return ''
})
const pity = computed(() => {
  if (props.view.kind !== 'card' || props.view.isNew) return ''
  const q = props.view.quantity ?? 0
  if (q < 2) return ''
  const chance = Math.round(((q) / 500) * 1000) / 10
  return `Doublon ×${q} · chance shiny estimée ~${chance}%`
})
</script>

<template>
  <div class="reveal">
    <div class="reveal__head">
      <h2 class="reveal__title font-display">
        {{ title }}
      </h2>
      <p class="reveal__sub">
        {{ sub }}
      </p>
    </div>

    <!-- Carte -->
    <div
      v-if="view.kind === 'card'"
      class="reveal__stage"
    >
      <span class="reveal__burst" />
      <div
        class="reveal__emerge"
        :class="{ 'reveal__emerge--glow': isBig(view.card) }"
      >
        <HoloCard
          :card="view.card"
          size="lg"
          :is-new="view.isNew"
          :quantity="view.quantity"
        />
      </div>
    </div>

    <!-- Pièces -->
    <div
      v-else-if="view.kind === 'coins'"
      class="reveal__stage"
    >
      <span class="reveal__burst" />
      <div class="reveal__emerge">
        <div class="reveal__coin">
          <span class="reveal__coin-amt tabular">+{{ view.amount }}</span>
        </div>
      </div>
    </div>

    <!-- Charme Chroma -->
    <div
      v-else-if="view.kind === 'charme'"
      class="reveal__stage"
    >
      <span class="reveal__burst" />
      <div class="reveal__emerge">
        <div class="reveal__charme">
          <UIcon
            name="i-lucide-sparkles"
            class="size-16"
          />
        </div>
      </div>
    </div>

    <!-- Choix (event card-choice) : on garde une carte sur deux -->
    <div
      v-else
      class="reveal__stage reveal__stage--choice"
    >
      <span class="reveal__burst" />
      <button
        v-for="(side, i) in [view.left, view.right]"
        :key="i"
        type="button"
        class="reveal__choice"
        :disabled="view.resolving"
        :style="{ animationDelay: i * 0.12 + 's' }"
        @click="emit('pick', side)"
      >
        <HoloCard
          :card="side"
          size="md"
          :interactive="false"
        />
      </button>
      <div
        v-if="view.resolving"
        class="reveal__spinner"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-8 animate-spin"
        />
      </div>
    </div>

    <p
      v-if="pity"
      class="reveal__pity"
    >
      {{ pity }}
    </p>

    <PButton
      v-if="view.kind !== 'choice'"
      :color="view.kind === 'card' ? 'success' : 'primary'"
      class="reveal__finish"
      @click="emit('finish')"
    >
      <UIcon
        :name="view.kind === 'card' ? 'i-lucide-book-heart' : 'i-lucide-check'"
        class="size-5"
      />
      {{ view.kind === 'card' ? 'Ranger dans l\'album' : 'Continuer' }}
    </PButton>
  </div>
</template>

<style scoped>
.reveal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
  width: 100%;
}
.reveal__head { display: flex; flex-direction: column; gap: 4px; }
.reveal__title { font-weight: 700; font-size: clamp(1.35rem, 4vw, 1.7rem); }
.reveal__sub { font-weight: 700; font-size: 0.82rem; color: var(--ui-text-muted); }

.reveal__stage {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 300px;
}
.reveal__stage--choice {
  grid-auto-flow: column;
  gap: clamp(14px, 4vw, 40px);
}
.reveal__burst {
  position: absolute;
  left: 50%;
  top: 46%;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 235, 170, .9), transparent 65%);
  animation: burst .7s ease-out both;
  pointer-events: none;
  z-index: 0;
}
.reveal__emerge {
  position: relative;
  z-index: 1;
  border-radius: 22px;
  animation: emerge .8s cubic-bezier(.2, .8, .3, 1) both;
}
.reveal__emerge--glow { animation: emerge .8s cubic-bezier(.2, .8, .3, 1) both, glowpulse 1.8s ease-in-out .8s infinite; }

.reveal__coin {
  display: grid;
  place-items: center;
  width: 168px;
  height: 168px;
  border-radius: 50%;
  background: radial-gradient(circle at 36% 30%, #fff6dc, #f6c453 52%, #dd9a1f);
  box-shadow: 0 16px 34px rgba(214, 152, 40, .5), inset 0 4px 0 rgba(255, 255, 255, .5), inset 0 -8px 14px rgba(150, 100, 20, .35);
  border: 5px solid rgba(255, 255, 255, .55);
}
.reveal__coin-amt {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 2.4rem;
  color: #7a4c07;
  text-shadow: 0 1px 0 rgba(255, 255, 255, .5);
}
.reveal__charme {
  display: grid;
  place-items: center;
  width: 168px;
  height: 168px;
  border-radius: 50%;
  color: #fff;
  background: radial-gradient(circle at 36% 30%, #e9d5ff, #a06cc4 55%, #7a49a8);
  box-shadow: 0 16px 34px rgba(122, 73, 168, .5), inset 0 4px 0 rgba(255, 255, 255, .4);
  border: 5px solid rgba(255, 255, 255, .5);
}

.reveal__choice {
  position: relative;
  z-index: 1;
  border-radius: 18px;
  cursor: pointer;
  transition: transform .18s var(--ease-pop), filter .18s ease;
  animation: emerge .7s cubic-bezier(.2, .8, .3, 1) both;
}
.reveal__choice:hover:not(:disabled) { transform: translateY(-8px) scale(1.03); }
.reveal__choice:disabled { cursor: progress; filter: saturate(.7) opacity(.75); }
.reveal__choice:focus-visible {
  outline: 3px solid var(--color-poke-400);
  outline-offset: 4px;
  border-radius: 20px;
}
.reveal__spinner {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--color-poke-500);
  z-index: 2;
}

.reveal__pity { font-size: 0.78rem; color: var(--ui-text-dimmed); margin-top: -6px; }
.reveal__finish { margin-top: 4px; }

@media (prefers-reduced-motion: reduce) {
  .reveal__burst, .reveal__emerge, .reveal__emerge--glow, .reveal__choice { animation: none; }
}
</style>
