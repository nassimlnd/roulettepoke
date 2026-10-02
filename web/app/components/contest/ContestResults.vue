<script setup lang="ts">
// Classement d'un concours terminé : scores arrondis sans faux ex-aequo,
// gagnant mis en avant, lot légendaire (déjà choisi, ou à choisir si c'est moi).
import type { DomainContest } from '~/types/domain'
import { displayScores } from '~/utils/contest'

const props = defineProps<{ contest: DomainContest, me: string | null }>()
const emit = defineEmits<{ reveal: [], claim: [] }>()

const rows = computed(() => [...props.contest.results].sort((a, b) => a.placement - b.placement))
const scores = computed(() => displayScores(props.contest.results))
const winner = computed(() => rows.value.find(r => r.placement === 1) ?? null)
const canClaim = computed(() =>
  !!winner.value && winner.value.userId === props.me && !winner.value.prizeCardId)
</script>

<template>
  <section class="cr">
    <div class="cr__head">
      <h2 class="cr__title font-display">
        Résultats
      </h2>
      <PButton
        color="neutral"
        icon="i-lucide-play"
        @click="emit('reveal')"
      >
        Revoir le dévoilement
      </PButton>
    </div>
    <ol class="cr__list">
      <li
        v-for="r in rows"
        :key="r.userId"
        class="res"
        :class="{ 'res--winner': r.placement === 1, 'res--mine': r.userId === me }"
      >
        <span class="res__rank tabular">{{ r.placement === 1 ? '🏆' : `#${r.placement}` }}</span>
        <img
          v-if="r.imageUrl"
          :src="r.imageUrl"
          :alt="r.cardName"
          class="res__img"
        >
        <span class="res__who">
          <b>{{ r.cardName }}</b>
          <span class="res__user">{{ r.username }}</span>
        </span>
        <span class="res__score tabular">{{ scores.get(r.placement) }}</span>
        <span
          v-if="r.placement === 1"
          class="res__note"
        >
          Pokémon gagnant ! Il part en tournée internationale.{{ r.prizeCardName ? ` Récompense : ${r.prizeCardName}.` : '' }}
        </span>
      </li>
    </ol>
    <PButton
      v-if="canClaim"
      icon="i-lucide-gift"
      @click="emit('claim')"
    >
      Choisir ta légendaire
    </PButton>
  </section>
</template>

<style scoped>
.cr { display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }
.cr__head { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.cr__title { font-weight: 700; font-size: 1.1rem; margin: 0; }
.cr__list { width: 100%; list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.res {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  grid-template-areas: 'rank img who score' 'rank img note note';
  align-items: center;
  gap: 2px 10px;
  padding: 8px 12px;
  border-radius: 12px;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
}
.res--winner { background: color-mix(in oklab, #f6c453 20%, var(--ui-bg-elevated)); border-color: #e0a92e; }
.res--mine { border-color: var(--color-poke-400); }
.res__rank { grid-area: rank; font-family: var(--font-display); font-weight: 700; min-width: 2.2em; }
.res__img { grid-area: img; width: 40px; height: 40px; object-fit: contain; }
.res__who { grid-area: who; display: flex; flex-direction: column; min-width: 0; font-size: .88rem; }
.res__user { font-size: .76rem; color: var(--ui-text-muted); }
.res__score { grid-area: score; font-family: var(--font-display); font-weight: 700; font-size: 1.05rem; }
.res__note { grid-area: note; font-size: .78rem; color: #8a5a12; font-weight: 600; }
</style>
