<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import type { ColoringCell } from '~/types/domain'
import { cellIndex } from '~/utils/coloring'

// Paintkemon (v5.0) : un coloriage numéroté collaboratif, sans enjeu — « un
// moment chill ». Chaque case affiche le numéro de sa couleur cible tant
// qu'elle n'est pas coloriée ; les cases hors dessin ne se jouent pas. Les
// coups des autres dresseurs arrivent en direct.
const coloring = useColoringStore()
const { loading, errorMsg, retry } = usePageData(() => coloring.load())
onMounted(() => coloring.connect())
onUnmounted(() => coloring.disconnect())

const grid = computed(() => coloring.grid)
const pct = computed(() => (grid.value?.playable ? Math.round((grid.value.filled / grid.value.playable) * 100) : 0))
const liveLabel = computed(() => (coloring.live === 'open' ? 'En direct' : coloring.live === 'connecting' ? 'Connexion…' : 'Hors ligne'))
const hexOf = (id: string | null) => (id ? coloring.colorById.get(id)?.hex : undefined)
const numberOf = (id: string | null) => (id ? coloring.colorById.get(id)?.number ?? '' : '')

// Zoom = taille de case en px (comme l'original) : la grille grandit vraiment,
// le défilement natif sert à se déplacer. Ctrl + molette zoome aussi.
const MIN_CELL = 4
const MAX_CELL = 28
const DEFAULT_CELL = 12
const cellSize = ref(DEFAULT_CELL)
function zoomBy(f: number) {
  cellSize.value = Math.min(MAX_CELL, Math.max(MIN_CELL, cellSize.value * f))
}
function onWheel(e: WheelEvent) {
  if (!e.ctrlKey) return
  e.preventDefault()
  zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1)
}
const gridStyle = computed(() => ({
  '--cell': `${cellSize.value}px`,
  'gridTemplateColumns': `repeat(${grid.value?.width ?? 0}, var(--cell))`,
  'width': `${(grid.value?.width ?? 0) * cellSize.value}px`
}))

// Peinture par délégation (3 870 cases) : clic ou clique-glisse à la souris,
// chaque case une seule fois par tracé ; au doigt, un simple tap (le glissé
// reste un défilement). Le « click » qui suit un pointerdown est ignoré.
const cellAt = (el: EventTarget | null): ColoringCell | null => {
  const btn = (el as HTMLElement | null)?.closest<HTMLElement>('.cell[data-x]')
  if (!btn || !grid.value) return null
  return grid.value.cells[cellIndex(grid.value, Number(btn.dataset.x), Number(btn.dataset.y))] ?? null
}
let dragging = false
let painted = new Set<string>()
const key = (c: ColoringCell) => `${c.x},${c.y}`
function paintOnce(c: ColoringCell | null) {
  if (!c || painted.has(key(c))) return
  painted.add(key(c))
  void coloring.paint(c)
}
function onDown(e: PointerEvent) {
  painted = new Set()
  if (e.pointerType === 'touch' || e.button !== 0) return
  dragging = true
  paintOnce(cellAt(e.target))
}
function onOver(e: PointerEvent) {
  if (dragging) paintOnce(cellAt(e.target))
}
function onClick(e: MouseEvent) {
  const c = cellAt(e.target)
  if (c && !painted.has(key(c))) paintOnce(c)
}
const endStroke = () => {
  dragging = false
}
useEventListener(window, 'pointerup', endStroke)
useEventListener(window, 'pointercancel', endStroke)

function cellLabel(c: ColoringCell): string {
  const pos = `Case ${c.x + 1}, ${c.y + 1}`
  return c.colorId ? `${pos} coloriée` : `${pos}, à colorier avec la couleur ${numberOf(c.targetId)}`
}
</script>

<template>
  <div class="pk">
    <header class="pk__head">
      <div>
        <h1 class="pk__title font-display">
          Paintkemon
        </h1>
        <p class="pk__lead">
          Un coloriage numéroté à compléter ensemble, sans enjeu : choisis une couleur, puis clique (ou glisse) sur les cases qui portent son numéro.
        </p>
      </div>
      <span
        class="pk__live"
        :class="`pk__live--${coloring.live}`"
      >
        <i />{{ liveLabel }}
      </span>
    </header>

    <div
      v-if="loading"
      class="pk__load"
    >
      <USkeleton class="h-16 w-full rounded-2xl" />
      <USkeleton class="h-96 w-full rounded-2xl" />
    </div>

    <PageError
      v-else-if="errorMsg"
      :message="errorMsg"
      :pending="loading"
      @retry="retry"
    />

    <template v-else-if="grid">
      <PPanel class="prog">
        <div class="prog__row">
          <span class="prog__k">Avancement</span>
          <span class="prog__v tabular">{{ grid.filled.toLocaleString('fr-FR') }} / {{ grid.playable.toLocaleString('fr-FR') }} cases · {{ pct }} %</span>
        </div>
        <div
          class="prog__bar"
          role="progressbar"
          :aria-valuenow="grid.filled"
          :aria-valuemax="grid.playable"
        >
          <i :style="{ width: `${pct}%` }" />
        </div>
        <p
          v-if="coloring.complete"
          class="prog__done"
        >
          🎉 Dessin terminé ! Merci à tous les dresseurs — un nouveau modèle arrivera quand le jeu en proposera un.
        </p>
      </PPanel>

      <div
        class="palette"
        role="radiogroup"
        aria-label="Palette"
      >
        <button
          v-for="c in grid.palette"
          :key="c.id"
          type="button"
          class="swatch"
          :class="{ 'swatch--on': coloring.selectedColorId === c.id }"
          :style="{ '--sw': c.hex }"
          role="radio"
          :aria-checked="coloring.selectedColorId === c.id"
          :title="c.name"
          :disabled="coloring.complete"
          @click="coloring.select(c.id)"
        >
          <span class="swatch__num tabular">{{ c.number }}</span>
          <span class="sr-only">{{ c.name }}</span>
        </button>
      </div>

      <div class="zoom">
        <PButton
          color="neutral"
          icon="i-lucide-zoom-out"
          aria-label="Zoom arrière"
          @click="zoomBy(1 / 1.25)"
        />
        <PButton
          color="neutral"
          @click="cellSize = DEFAULT_CELL"
        >
          Réinitialiser le zoom
        </PButton>
        <PButton
          color="neutral"
          icon="i-lucide-zoom-in"
          aria-label="Zoom avant"
          @click="zoomBy(1.25)"
        />
        <span class="zoom__hint">Ctrl + molette pour zoomer, défilement pour se déplacer.</span>
      </div>

      <UAlert
        v-if="coloring.error"
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :title="coloring.error"
      />

      <div
        class="wrap"
        @wheel="onWheel"
      >
        <div
          class="grid"
          :style="gridStyle"
          @pointerdown="onDown"
          @pointerover="onOver"
          @click="onClick"
        >
          <template
            v-for="c in grid.cells"
            :key="`${c.x},${c.y}`"
          >
            <div
              v-if="!c.targetId"
              class="cell cell--off"
              aria-hidden="true"
            />
            <button
              v-else
              type="button"
              class="cell"
              :class="{ 'cell--done': c.colorId }"
              :style="c.colorId ? { background: hexOf(c.colorId) } : undefined"
              :data-x="c.x"
              :data-y="c.y"
              :disabled="!!c.colorId || coloring.complete"
              :aria-label="cellLabel(c)"
              v-text="c.colorId ? '' : numberOf(c.targetId)"
            />
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pk { display: flex; flex-direction: column; gap: 14px; }
.pk__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.pk__title { font-weight: 700; font-size: 1.7rem; margin: 0; }
.pk__lead { color: var(--ui-text-muted); font-size: .9rem; margin: 4px 0 0; max-width: 40rem; }
.pk__live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: .76rem;
  font-weight: 700;
  color: var(--ui-text-muted);
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
.pk__live i { width: 8px; height: 8px; border-radius: 50%; background: var(--ui-text-dimmed); }
.pk__live--open i { background: #3f9e66; box-shadow: 0 0 0 3px color-mix(in oklab, #5bbf82 30%, transparent); }
.pk__live--connecting i { background: #e0a92e; }
.pk__load { display: flex; flex-direction: column; gap: 12px; }

.prog { display: flex; flex-direction: column; gap: 8px; }
.prog__row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.prog__k { font-size: .72rem; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: var(--ui-text-dimmed); }
.prog__v { font-family: var(--font-display); font-weight: 700; color: var(--ui-text-highlighted); }
.prog__bar { height: 10px; border-radius: 99px; background: var(--ui-bg-accented); overflow: hidden; }
.prog__bar > i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #8b5cf6, #c65b9d); transition: width .4s var(--ease-glide); }
.prog__done { margin: 2px 0 0; font-weight: 700; font-size: .9rem; color: #3f9e66; }

.palette { display: flex; flex-wrap: wrap; gap: 8px; }
.swatch {
  position: relative;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 2px solid color-mix(in oklab, var(--sw) 60%, var(--ui-border));
  background: var(--sw);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: transform .15s var(--ease-pop), box-shadow .15s ease;
}
.swatch:hover:not(:disabled) { transform: translateY(-2px); }
.swatch--on { box-shadow: 0 0 0 3px var(--ui-bg), 0 0 0 5px #8b5cf6; transform: scale(1.06); }
.swatch:disabled { cursor: default; opacity: .6; }
.swatch:focus-visible { outline: 3px solid var(--color-poke-400); outline-offset: 2px; }
.swatch__num {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .8rem;
  color: #1c1c28;
  background: rgba(255, 255, 255, .78);
  padding: 1px 6px;
  border-radius: 999px;
}

.zoom { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.zoom__hint { font-size: .78rem; color: var(--ui-text-dimmed); }

.wrap {
  overflow: auto;
  max-height: 72vh;
  border: 1px solid var(--ui-border);
  border-radius: 14px;
  background: var(--ui-bg-muted);
  padding: 8px;
  touch-action: pan-x pan-y pinch-zoom;
}
.grid { display: grid; user-select: none; -webkit-user-select: none; }
.cell {
  width: var(--cell);
  height: var(--cell);
  border: none;
  padding: 0;
  margin: 0;
  background: #8a8a9c;
  color: #1c1c28;
  font-weight: 700;
  line-height: 1;
  font-size: clamp(5px, calc(var(--cell) * .55), 14px);
  display: grid;
  place-items: center;
  cursor: pointer;
  overflow: hidden;
}
.cell:focus-visible { outline: 2px solid #8b5cf6; outline-offset: -2px; }
.cell--done, .cell:disabled { cursor: default; }
.cell--off { background: transparent; }
</style>
