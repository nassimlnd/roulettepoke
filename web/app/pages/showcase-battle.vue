<script setup lang="ts">
import type { BattleRound } from '~/types/domain'
import { useBattleStore } from '~/stores/battle'

// Showcase de dev : lance un combat plein écran (BattleStage) avec des données
// factices et de vrais sprites (proxy /images). Non lié dans la navigation ;
// public pour prévisualiser le combat sans compte.
definePageMeta({ public: true })

const battle = useBattleStore()

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

function launch(label: string, color: string) {
  battle.present({
    rounds,
    won: true,
    themeColor: color,
    badgeUrl: '/images/badges/Kanto_1.png',
    title: `Arène ${label}`,
    winSub: `Badge ${label} obtenu !`
  })
}
</script>

<template>
  <div class="sc">
    <h1 class="font-display">
      BattleScene — showcase
    </h1>
    <p class="sc__lead">
      Lance un combat plein écran (overlay immersif) pour valider le rendu.
    </p>
    <div class="sc__ctrls">
      <PButton
        v-for="t in THEMES"
        :key="t.color"
        color="primary"
        @click="launch(t.label, t.color)"
      >
        Combat {{ t.label }}
      </PButton>
    </div>
  </div>
</template>

<style scoped>
.sc { display: flex; flex-direction: column; gap: 12px; max-width: 40rem; margin: 0 auto; }
.sc h1 { font-weight: 700; font-size: 1.5rem; }
.sc__lead { color: var(--ui-text-muted); font-size: .9rem; }
.sc__ctrls { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
</style>
