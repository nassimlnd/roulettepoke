<script setup lang="ts">
import type { StarterOption } from '~/stores/spin'
import type { PokeType } from '~/types/api'

// Écran de sélection du starter (avant le run). Une carte pastel par starter,
// avec la chaîne d'évolution en aperçu. PHASE 2 : alimenté par la collection.
defineProps<{ starters: StarterOption[] }>()
const emit = defineEmits<{ select: [id: string] }>()

const TYPE_HEX: Partial<Record<PokeType, string>> = {
  Feu: '#f0895e', Eau: '#6db6e6', Plante: '#7fc98a', Électrik: '#f2c94c'
}
const hex = (t: PokeType) => TYPE_HEX[t] ?? '#8b5cc4'
</script>

<template>
  <div class="pick">
    <header class="pick__head">
      <span class="pick__eyebrow font-display">Nouvelle aventure</span>
      <h2 class="pick__title font-display">
        Choisis ton starter
      </h2>
      <p class="pick__lead">
        Il t'accompagnera de bout en bout — et évoluera à chaque victoire.
      </p>
    </header>

    <div class="pick__grid">
      <button
        v-for="s in starters"
        :key="s.id"
        class="pcard"
        :style="{ '--c': hex((s.chain[0]?.type ?? 'Feu') as PokeType) }"
        @click="emit('select', s.id)"
      >
        <span class="pcard__disc">
          <img
            :src="s.chain[0]?.imageUrl"
            :alt="s.chain[0]?.name"
          >
        </span>
        <b class="pcard__name font-display">{{ s.chain[0]?.name }}</b>
        <span class="pcard__type">{{ s.chain[0]?.type }}</span>
        <span class="pcard__chain">
          <template
            v-for="(m, i) in s.chain"
            :key="m.num"
          >
            <img
              :src="m.imageUrl"
              :alt="m.name"
              class="pcard__mini"
            >
            <UIcon
              v-if="i < s.chain.length - 1"
              name="i-lucide-chevron-right"
              class="pcard__arrow"
            />
          </template>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.pick {
  margin: auto;
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 8px 4px;
}
.pick__head { text-align: center; display: flex; flex-direction: column; gap: 4px; }
.pick__eyebrow { font-weight: 800; font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: #ffcf6b; }
.pick__title { font-weight: 800; font-size: 1.7rem; color: #fff; }
.pick__lead { font-size: .9rem; color: rgba(255, 255, 255, .68); }

.pick__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
@media (min-width: 620px) { .pick__grid { grid-template-columns: repeat(4, 1fr); } }

.pcard {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 18px 12px 14px;
  border-radius: 22px;
  cursor: pointer;
  background:
    radial-gradient(120% 80% at 50% 0%, color-mix(in oklab, var(--c) 42%, #fff) 0%, color-mix(in oklab, var(--c) 20%, #fff) 100%);
  border: 3px solid color-mix(in oklab, var(--c) 60%, #fff);
  box-shadow: 0 8px 0 color-mix(in oklab, var(--c) 55%, #3a2f2a), 0 16px 30px -14px rgba(0, 0, 0, .6);
  transition: transform .16s var(--ease-pop), box-shadow .16s;
}
.pcard:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 0 color-mix(in oklab, var(--c) 55%, #3a2f2a), 0 22px 36px -14px rgba(0, 0, 0, .6);
}
.pcard:active { transform: translateY(-1px); }
.pcard__disc {
  display: grid;
  place-items: center;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 38%, #fff, color-mix(in oklab, var(--c) 24%, #fff));
  box-shadow: inset 0 -6px 12px rgba(0, 0, 0, .1);
}
.pcard__disc img { width: 78px; height: 78px; object-fit: contain; image-rendering: pixelated; filter: drop-shadow(0 4px 5px rgba(40, 30, 30, .3)); }
.pcard__name { font-weight: 800; font-size: 1.05rem; color: #3a2f2a; }
.pcard__type {
  font-weight: 800;
  font-size: .68rem;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: #fff;
  background: color-mix(in oklab, var(--c) 78%, #3a2f2a);
  padding: 2px 12px;
  border-radius: 999px;
}
.pcard__chain { display: flex; align-items: center; gap: 2px; margin-top: 4px; height: 30px; }
.pcard__mini { width: 26px; height: 26px; object-fit: contain; image-rendering: pixelated; opacity: .9; }
.pcard__arrow { width: 12px; height: 12px; color: color-mix(in oklab, var(--c) 70%, #3a2f2a); }

@media (prefers-reduced-motion: reduce) {
  .pcard { transition: none; }
}
</style>
