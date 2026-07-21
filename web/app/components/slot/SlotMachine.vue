<script setup lang="ts">
import type { SlotSymbol, SlotLine } from '~/types/api'
import { SLOT_ORDER, LINE_CELLS } from '~/utils/slot'

// Machine 3×3. Expose spin(cells, winningLines) : rebâtit les rouleaux (padding
// aléatoire + cibles) puis les fait défiler avec arrêts décalés, avant de faire
// briller les cellules gagnantes.
interface Cell { symbol: SlotSymbol, key: string | null }

const CELL = 60
const PAD = 16
const DURATIONS = [1.9, 2.3, 2.7]
const ROWS = ['top', 'mid', 'bot'] as const

const reduced = usePreferredReducedMotion()
const machineEl = ref<HTMLElement>()
const strips = ref<Cell[][]>(idle())
const spun = ref([true, true, true])
const noTransition = ref(true)
const winning = ref<Set<string>>(new Set())

function randomSym(): SlotSymbol {
  return SLOT_ORDER[Math.floor(Math.random() * SLOT_ORDER.length)]!
}
function idle(): Cell[][] {
  return [0, 1, 2].map(col => ROWS.map(row => ({ symbol: randomSym(), key: `${col}_${row}` })))
}
function stripStyle(col: number) {
  const strip = strips.value[col]!
  return {
    transform: spun.value[col] ? `translateY(-${(strip.length - 3) * CELL}px)` : 'translateY(0)',
    transitionDuration: noTransition.value ? '0s' : (DURATIONS[col] ?? 2) + 's'
  }
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function spin(cells: Record<string, SlotSymbol>, winningLines: SlotLine[]) {
  winning.value = new Set()
  strips.value = [0, 1, 2].map((col) => {
    const pad: Cell[] = Array.from({ length: PAD }, () => ({ symbol: randomSym(), key: null }))
    const target: Cell[] = ROWS.map(row => ({ symbol: cells[`${col}_${row}`] ?? randomSym(), key: `${col}_${row}` }))
    return [...pad, ...target]
  })

  function reveal() {
    winning.value = new Set(winningLines.flatMap(l => LINE_CELLS[l] ?? []))
  }

  if (reduced.value === 'reduce') {
    noTransition.value = true
    spun.value = [true, true, true]
    await nextTick()
    reveal()
    return
  }

  noTransition.value = true
  spun.value = [false, false, false]
  await nextTick()
  void machineEl.value?.offsetHeight // reflow → point de départ instantané
  noTransition.value = false
  spun.value = [true, true, true]
  await wait((DURATIONS[2] ?? 2.7) * 1000 + 180)
  reveal()
}

defineExpose({ spin })
</script>

<template>
  <div
    ref="machineEl"
    class="machine"
  >
    <div class="machine__frame">
      <div class="machine__reels">
        <div
          v-for="(strip, col) in strips"
          :key="col"
          class="reel"
        >
          <div
            class="reel__strip"
            :style="stripStyle(col)"
          >
            <div
              v-for="(cell, i) in strip"
              :key="i"
              class="reel__cell"
              :class="{ 'reel__cell--win': cell.key && winning.has(cell.key) }"
            >
              <SlotSymbolTile
                :symbol="cell.symbol"
                :size="44"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.machine {
  display: flex;
  justify-content: center;
}
.machine__frame {
  padding: 14px;
  border-radius: 24px;
  background: linear-gradient(180deg, #ee5a48 0%, #c62617 55%, #a41f14 100%);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, .3),
    inset 0 -6px 14px rgba(0, 0, 0, .3),
    0 16px 34px rgba(150, 30, 20, .3);
  border: 3px solid rgba(255, 255, 255, .25);
}
.machine__reels {
  display: flex;
  gap: 8px;
  padding: 10px;
  border-radius: 16px;
  background: linear-gradient(180deg, #2a1210, #3a1a16);
  box-shadow: inset 0 3px 10px rgba(0, 0, 0, .5);
}
.reel {
  position: relative;
  width: 70px;
  height: 180px; /* 3 × 60 */
  overflow: hidden;
  border-radius: 12px;
  background: var(--ui-bg-elevated);
  box-shadow: inset 0 8px 12px -6px rgba(0, 0, 0, .3), inset 0 -8px 12px -6px rgba(0, 0, 0, .3);
}
/* voile de brillance haut/bas pour l'effet « vitre » */
.reel::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(255, 255, 255, .5), transparent 22%, transparent 78%, rgba(0, 0, 0, .12));
  z-index: 3;
}
.reel__strip {
  display: flex;
  flex-direction: column;
  transition-property: transform;
  transition-timing-function: cubic-bezier(.11, .68, .24, 1);
  will-change: transform;
}
.reel__cell {
  position: relative;
  height: 60px;
  flex: none;
  display: grid;
  place-items: center;
}
.reel__cell--win::before {
  content: "";
  position: absolute;
  inset: 5px;
  border-radius: 12px;
  background: radial-gradient(circle, rgba(255, 220, 120, .7), rgba(255, 220, 120, 0) 70%);
  animation: winpulse 1.2s ease-in-out infinite;
  z-index: 0;
}
.reel__cell--win :deep(.sym) {
  position: relative;
  z-index: 1;
  animation: winpop .4s var(--ease-pop) both;
}
@keyframes winpulse {
  0%, 100% { opacity: .5; transform: scale(.9); }
  50% { opacity: 1; transform: scale(1.15); }
}
@keyframes winpop {
  0% { transform: scale(.8); }
  60% { transform: scale(1.14); }
  100% { transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .reel__cell--win::before, .reel__cell--win :deep(.sym) { animation: none; }
}
</style>
