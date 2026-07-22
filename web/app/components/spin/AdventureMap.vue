<script setup lang="ts">
import type { AdvNode } from '~/types/domain'

// Parcours de l'aventure : trail vertical de nœuds. Les nœuds franchis sont
// « validés », le prochain (« cible ») pulse, les suivants sont estompés.
const props = defineProps<{
  nodes: AdvNode[]
  index: number
  nextChance: number
}>()

const ICON: Record<AdvNode['kind'], string> = {
  start: 'i-lucide-flag',
  elite: 'i-lucide-swords',
  champion: 'i-lucide-crown',
  treasure: 'i-lucide-gift',
  legendary: 'i-lucide-sparkles'
}

type Status = 'done' | 'target' | 'upcoming'
function statusOf(i: number): Status {
  if (i <= props.index) return 'done'
  if (i === props.index + 1) return 'target'
  return 'upcoming'
}
</script>

<template>
  <ol class="trail">
    <li
      v-for="(n, i) in nodes"
      :key="i"
      class="step"
      :class="[`step--${statusOf(i)}`, `step--${n.kind}`]"
    >
      <span
        v-if="i > 0"
        class="step__link"
        aria-hidden="true"
      />
      <span class="step__dot">
        <img
          v-if="n.opponent && statusOf(i) !== 'upcoming'"
          :src="n.opponent.imageUrl"
          :alt="n.opponent.name"
          class="step__mon"
        >
        <UIcon
          v-else
          :name="ICON[n.kind]"
          class="size-5"
        />
        <UIcon
          v-if="statusOf(i) === 'done' && (n.kind === 'elite' || n.kind === 'champion')"
          name="i-lucide-check"
          class="step__check size-3"
        />
      </span>
      <div class="step__body">
        <span class="step__title">{{ n.title }}</span>
        <span
          v-if="n.opponent && statusOf(i) !== 'upcoming'"
          class="step__sub"
        >{{ n.opponent.name }}</span>
      </div>
      <span
        v-if="statusOf(i) === 'target' && n.baseWinChance"
        class="step__odds tabular"
      >{{ nextChance }} %</span>
    </li>
  </ol>
</template>

<style scoped>
.trail { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0; }
.step {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 9px 0;
  padding-left: 8px;
}
/* Connecteur vertical entre les pastilles */
.step__link {
  position: absolute;
  left: calc(8px + 23px); /* centre de la pastille (46/2) */
  top: -50%;
  height: 100%;
  width: 3px;
  transform: translateX(-50%);
  background: var(--ui-border-accented);
  border-radius: 2px;
}
.step--done .step__link { background: linear-gradient(180deg, #8fd6a8, #5bbf82); }

.step__dot {
  position: relative;
  flex: none;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--ui-bg-accented);
  box-shadow: inset 0 0 0 3px var(--ui-bg-elevated), 0 0 0 3px var(--ui-border-accented);
  z-index: 1;
}
.step__mon { width: 40px; height: 40px; object-fit: contain; }

.step--done .step__dot { background: linear-gradient(150deg, #8fd6a8, #5bbf82); box-shadow: inset 0 0 0 3px var(--ui-bg-elevated), 0 0 0 3px #5bbf82; }
.step--target .step__dot {
  background: linear-gradient(150deg, #ee5a48, var(--color-poke-500));
  box-shadow: inset 0 0 0 3px var(--ui-bg-elevated), 0 0 0 3px var(--color-poke-500);
  animation: pulse 1.5s ease-in-out infinite;
}
.step--upcoming .step__dot { color: var(--ui-text-dimmed); }
.step--treasure.step--target .step__dot { background: linear-gradient(150deg, #f6c453, #e0a92e); box-shadow: inset 0 0 0 3px var(--ui-bg-elevated), 0 0 0 3px #e0a92e; }
.step--legendary.step--target .step__dot { background: linear-gradient(150deg, #b57ee0, #8b5cc4); box-shadow: inset 0 0 0 3px var(--ui-bg-elevated), 0 0 0 3px #8b5cc4; }

.step__check {
  position: absolute;
  right: -2px;
  bottom: -2px;
  color: #fff;
  background: #3f9e66;
  border-radius: 50%;
  padding: 1px;
  box-shadow: 0 0 0 2px var(--ui-bg-default);
}

.step__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.step__title { font-family: var(--font-display); font-weight: 700; font-size: .95rem; color: var(--ui-text-highlighted); }
.step--upcoming .step__title { color: var(--ui-text-dimmed); }
.step__sub { font-size: .78rem; color: var(--ui-text-muted); }

.step__odds {
  flex: none;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: .82rem;
  color: var(--color-poke-600);
  background: var(--color-poke-50);
  padding: 3px 10px;
  border-radius: 999px;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
@media (prefers-reduced-motion: reduce) {
  .step--target .step__dot { animation: none; }
}
</style>
