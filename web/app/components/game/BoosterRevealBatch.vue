<script setup lang="ts">
import type { DomainCard } from '~/types/domain'

// Révélation d'une ouverture « ×5 » (direction Mochidex) : burst doré puis les
// cartes émergent en grille, décalées (stagger). Gère les cartes (neuves /
// doublons), les événements pièces / Charme, et le choix interactif (event
// card-choice) résolu sur place — une carte sur deux rejoint la grille.
export type BatchTile
  = | { kind: 'card', card: DomainCard, isNew: boolean, quantity: number }
    | { kind: 'coins', amount: number }
    | { kind: 'charme' }
    | {
      kind: 'choice'
      choiceId: string
      left: DomainCard
      right: DomainCard
      resolving: boolean
      resolved: { card: DomainCard, isNew: boolean, quantity: number } | null
    }

const props = defineProps<{ tiles: BatchTile[], count: number }>()
const emit = defineEmits<{ pick: [index: number, card: DomainCard], finish: [] }>()

const pendingChoices = computed(() => props.tiles.filter(t => t.kind === 'choice' && !t.resolved).length)

const newCount = computed(() =>
  props.tiles.reduce((n, t) => {
    if (t.kind === 'card') return n + (t.isNew ? 1 : 0)
    if (t.kind === 'choice' && t.resolved) return n + (t.resolved.isNew ? 1 : 0)
    return n
  }, 0))

const coinsTotal = computed(() =>
  props.tiles.reduce((n, t) => (t.kind === 'coins' ? n + t.amount : n), 0))
const charmeCount = computed(() => props.tiles.filter(t => t.kind === 'charme').length)

// Ligne de résumé : « 5 cartes · 2 nouvelles ✦ · +240 pièces · 1 Charme ».
const summary = computed(() => {
  const cards = props.tiles.filter(t => t.kind === 'card' || (t.kind === 'choice' && t.resolved)).length
  const parts: string[] = []
  if (cards) parts.push(`${cards} carte${cards > 1 ? 's' : ''}`)
  if (newCount.value) parts.push(`${newCount.value} nouvelle${newCount.value > 1 ? 's' : ''} ✦`)
  if (coinsTotal.value) parts.push(`+${coinsTotal.value} pièces`)
  if (charmeCount.value) parts.push(`${charmeCount.value} Charme`)
  return parts.join(' · ')
})
</script>

<template>
  <div class="batch">
    <div class="batch__head">
      <h2 class="batch__title font-display">
        {{ count }} boosters ouverts !
      </h2>
      <p class="batch__sub">
        {{ summary }}
      </p>
    </div>

    <span class="batch__burst" />

    <div class="batch__grid">
      <template
        v-for="(t, i) in tiles"
        :key="i"
      >
        <!-- Choix non résolu : deux cartes, on en garde une -->
        <div
          v-if="t.kind === 'choice' && !t.resolved"
          class="tile tile--wide"
          :style="{ '--d': i * 0.07 + 's' }"
        >
          <p class="tile__pick-lbl font-display">
            <UIcon
              name="i-lucide-git-fork"
              class="size-4"
            /> Choisis ta carte
          </p>
          <div class="tile__pick">
            <button
              v-for="(side, s) in [t.left, t.right]"
              :key="s"
              type="button"
              class="tile__opt"
              :disabled="t.resolving"
              @click="emit('pick', i, side)"
            >
              <HoloCard
                :card="side"
                size="sm"
                :interactive="false"
              />
            </button>
          </div>
          <span
            v-if="t.resolving"
            class="tile__spin"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="size-6 animate-spin"
            />
          </span>
        </div>

        <!-- Carte (tirage direct ou choix résolu) -->
        <div
          v-else-if="t.kind === 'card' || (t.kind === 'choice' && t.resolved)"
          class="tile"
          :style="{ '--d': i * 0.07 + 's' }"
        >
          <HoloCard
            :card="t.kind === 'card' ? t.card : t.resolved!.card"
            size="sm"
            :is-new="t.kind === 'card' ? t.isNew : t.resolved!.isNew"
            :quantity="t.kind === 'card' ? t.quantity : t.resolved!.quantity"
            :interactive="false"
          />
        </div>

        <!-- Pièces -->
        <div
          v-else-if="t.kind === 'coins'"
          class="tile"
          :style="{ '--d': i * 0.07 + 's' }"
        >
          <div class="medal medal--coin">
            <UIcon
              name="i-lucide-coins"
              class="size-8"
            />
            <span class="medal__amt tabular">+{{ t.amount }}</span>
          </div>
          <span class="tile__cap">Pièces</span>
        </div>

        <!-- Charme Chroma -->
        <div
          v-else
          class="tile"
          :style="{ '--d': i * 0.07 + 's' }"
        >
          <div class="medal medal--charme">
            <UIcon
              name="i-lucide-sparkles"
              class="size-9"
            />
          </div>
          <span class="tile__cap">Charme Chroma</span>
        </div>
      </template>
    </div>

    <div class="batch__foot">
      <p
        v-if="pendingChoices"
        class="batch__hint"
      >
        <UIcon
          name="i-lucide-hand-pointer"
          class="size-4"
        />
        {{ pendingChoices }} choix à faire pour continuer
      </p>
      <PButton
        color="success"
        size="lg"
        :disabled="pendingChoices > 0"
        @click="emit('finish')"
      >
        <UIcon
          name="i-lucide-book-heart"
          class="size-5"
        />
        Tout ranger dans l'album
      </PButton>
    </div>
  </div>
</template>

<style scoped>
.batch {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  width: 100%;
  text-align: center;
}
.batch__head { display: flex; flex-direction: column; gap: 4px; }
.batch__title { font-weight: 700; font-size: clamp(1.35rem, 4vw, 1.7rem); }
.batch__sub { font-weight: 700; font-size: 0.85rem; color: var(--ui-text-muted); }

.batch__burst {
  position: absolute;
  left: 50%;
  top: 120px;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 235, 170, .8), transparent 65%);
  animation: burst .8s ease-out both;
  pointer-events: none;
  z-index: 0;
}

.batch__grid {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  gap: 16px 14px;
  width: 100%;
  max-width: 760px;
}

.tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  animation: emerge .7s cubic-bezier(.2, .8, .3, 1) both;
  animation-delay: var(--d);
}
.tile--wide {
  flex-basis: 100%;
  gap: 8px;
  padding: 12px;
  border-radius: 18px;
  background: color-mix(in oklab, var(--color-poke-500) 7%, var(--ui-bg-elevated));
  border: 1px dashed color-mix(in oklab, var(--color-poke-500) 40%, transparent);
}
.tile__pick-lbl {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: .82rem;
  color: var(--color-poke-600);
}
.tile__pick { display: flex; justify-content: center; gap: 16px; }
.tile__opt {
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  border-radius: 14px;
  transition: transform .16s var(--ease-pop), filter .16s ease;
}
.tile__opt:hover:not(:disabled) { transform: translateY(-6px) scale(1.04); }
.tile__opt:disabled { cursor: progress; filter: saturate(.7) opacity(.7); }
.tile__opt:focus-visible { outline: 3px solid var(--color-poke-400); outline-offset: 3px; }
.tile__spin {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--color-poke-500);
}

.tile__cap { font-weight: 700; font-size: .74rem; color: var(--ui-text-muted); }

/* Médailles pièces / Charme — hauteur alignée sur une carte « sm » */
.medal {
  display: grid;
  place-items: center;
  gap: 2px;
  width: 112px;
  height: 156px;
  border-radius: 18px;
  color: #fff;
}
.medal--coin {
  background: radial-gradient(circle at 38% 28%, #fff6dc, #f6c453 54%, #dd9a1f);
  color: #7a4c07;
  box-shadow: 0 12px 26px rgba(214, 152, 40, .42), inset 0 3px 0 rgba(255, 255, 255, .5);
  border: 3px solid rgba(255, 255, 255, .5);
}
.medal--charme {
  background: radial-gradient(circle at 38% 28%, #e9d5ff, #a06cc4 55%, #7a49a8);
  box-shadow: 0 12px 26px rgba(122, 73, 168, .42), inset 0 3px 0 rgba(255, 255, 255, .4);
  border: 3px solid rgba(255, 255, 255, .45);
}
.medal__amt { font-family: var(--font-display); font-weight: 800; font-size: 1.15rem; }

.batch__foot { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: 2px; }
.batch__hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: .82rem;
  color: var(--color-poke-600);
}

@media (prefers-reduced-motion: reduce) {
  .batch__burst, .tile { animation: none; }
}
</style>
