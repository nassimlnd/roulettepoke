<script setup lang="ts">
import type { BattleRound } from '~/types/domain'

// Showcase de dev pour valider BattleScene (données factices, sprites réels via
// le proxy /images). Non lié dans la navigation.
const MONS = {
  articuno: { name: 'Artikodin', imageUrl: '/images/articuno.webp' },
  moltres: { name: 'Sulfura', imageUrl: '/images/moltres.webp' },
  zapdos: { name: 'Électhor', imageUrl: '/images/zapdos.webp' },
  mew: { name: 'Mew', imageUrl: '/images/mew.webp' },
  mewtwo: { name: 'Mewtwo', imageUrl: '/images/mewtwo.webp' }
}
const rounds: BattleRound[] = [
  { round: 1, player: MONS.moltres, champion: MONS.articuno, winProbability: 64, playerWon: true },
  { round: 2, player: MONS.zapdos, champion: MONS.mewtwo, winProbability: 38, playerWon: false },
  { round: 3, player: MONS.mew, champion: MONS.articuno, winProbability: 58, playerWon: true }
]

const THEMES = [
  { label: 'Plante', color: '#7fc98a' },
  { label: 'Eau', color: '#6db6e6' },
  { label: 'Feu', color: '#f0895e' },
  { label: 'Roche', color: '#cbb083' },
  { label: 'Psy', color: '#e88bb6' }
]
const theme = ref(THEMES[0]!.color)
const runKey = ref(0)
function replay() {
  runKey.value++
}
function pickTheme(color: string) {
  theme.value = color
  replay()
}
</script>

<template>
  <div class="sc">
    <header>
      <h1 class="font-display">
        BattleScene — showcase
      </h1>
      <div class="sc__ctrls">
        <button
          v-for="t in THEMES"
          :key="t.color"
          class="chip"
          :class="{ 'chip--on': theme === t.color }"
          :style="{ '--c': t.color }"
          @click="pickTheme(t.color)"
        >
          {{ t.label }}
        </button>
        <PButton
          color="primary"
          @click="replay"
        >
          Rejouer
        </PButton>
      </div>
    </header>

    <div class="sc__stage">
      <BattleScene
        :key="runKey"
        :rounds="rounds"
        :won="true"
        :theme-color="theme"
        badge-url="/images/badges/Kanto_1.png"
        win-sub="Badge Roche obtenu — Arène d'Argenta."
      />
    </div>
  </div>
</template>

<style scoped>
.sc { display: flex; flex-direction: column; gap: 16px; max-width: 44rem; margin: 0 auto; }
.sc h1 { font-weight: 700; font-size: 1.5rem; }
.sc__ctrls { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; align-items: center; }
.chip {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .8rem;
  color: #fff;
  background: var(--c);
  padding: 6px 14px;
  border-radius: 999px;
  opacity: .5;
  transition: opacity .15s ease, transform .15s ease;
}
.chip--on { opacity: 1; transform: translateY(-1px); }
.sc__stage { max-width: 620px; }
</style>
