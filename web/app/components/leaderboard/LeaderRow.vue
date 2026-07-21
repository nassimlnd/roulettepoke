<script setup lang="ts">
import type { LeaderboardRow } from '~/types/domain'

// Ligne de classement (rangs 4+, position du joueur, tricheurs). Le podium
// (top 3) a son propre rendu dans la page.
defineProps<{ row: LeaderboardRow, you?: boolean }>()
</script>

<template>
  <div
    class="row"
    :class="{ 'row--you': you }"
  >
    <span class="row__rank tabular">{{ row.rank }}</span>
    <RankAvatar
      :row="row"
      :size="46"
    />
    <div class="row__main">
      <div class="row__name-line">
        <span class="row__name">{{ row.username }}</span>
        <span
          v-if="you"
          class="row__you"
        >toi</span>
        <span
          v-if="row.badges.length"
          class="row__badges"
        >
          <img
            v-for="(b, i) in row.badges.slice(0, 8)"
            :key="i"
            :src="b.imageUrl"
            :alt="b.name"
            :title="b.name"
            class="row__badge"
            loading="lazy"
          >
        </span>
      </div>
      <div class="row__counts">
        <span
          class="cnt"
          title="Cartes standard"
        ><i class="cnt__dot cnt__dot--std" />{{ row.standardCount }}</span>
        <span
          class="cnt"
          title="Légendaires"
        ><i class="cnt__dot cnt__dot--leg" />{{ row.legendaryCount }}</span>
        <span
          class="cnt"
          title="Shiny"
        ><i class="cnt__dot cnt__dot--shy" />{{ row.shinyCount }}</span>
      </div>
    </div>
    <div class="row__score">
      <span class="row__score-num tabular">{{ row.score }}</span>
      <span class="row__score-lbl">pts</span>
    </div>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 16px;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, .04);
}
.row--you {
  border-color: color-mix(in oklab, var(--color-poke-500) 45%, transparent);
  background: var(--color-poke-50);
  box-shadow: 0 2px 8px color-mix(in oklab, var(--color-poke-500) 18%, transparent);
}
.row__rank {
  flex: none;
  width: 26px;
  text-align: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  color: var(--ui-text-dimmed);
}
.row__main { flex: 1; min-width: 0; }
.row__name-line {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}
.row__name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: .98rem;
  color: var(--ui-text-highlighted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row__you {
  flex: none;
  font-size: .62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: #fff;
  background: var(--color-poke-500);
  padding: 2px 7px;
  border-radius: 999px;
}
.row__badges { display: inline-flex; gap: 3px; flex: none; }
.row__badge {
  width: 18px;
  height: 18px;
  object-fit: contain;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, .2));
}
.row__counts {
  display: flex;
  gap: 12px;
  margin-top: 3px;
  font-size: .78rem;
  font-weight: 700;
  color: var(--ui-text-muted);
}
.cnt { display: inline-flex; align-items: center; gap: 4px; }
.cnt__dot {
  width: 9px;
  height: 9px;
  border-radius: 3px;
  transform: rotate(45deg);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .5);
}
.cnt__dot--std { background: #9aa8bd; }
.cnt__dot--leg { background: #e0a92e; }
.cnt__dot--shy { background: #c9b3ff; }
.row__score {
  flex: none;
  display: flex;
  align-items: baseline;
  gap: 3px;
}
.row__score-num {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.35rem;
  color: var(--color-poke-600);
}
.row__score-lbl { font-size: .7rem; font-weight: 700; color: var(--ui-text-dimmed); }
</style>
