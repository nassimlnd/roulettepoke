<script setup lang="ts">
import type { DomainCard, DomainOwnedCard } from '~/types/domain'
import { TYPE_GRADIENT, RARITY_META, SHINY_HOLO, hexA, cosmeticHp, STAGE_LABEL } from '~/utils/cardTheme'

// Carte holographique — direction « Mochidex » adaptée à nos vraies données.
// Dégradé de face par type, gemmes de rareté, holo + tilt/glare au pointeur.
const props = withDefaults(defineProps<{
  card: DomainCard | DomainOwnedCard
  size?: 'sm' | 'md' | 'lg' | 'xl'
  quantity?: number
  isNew?: boolean
  interactive?: boolean // tilt/glare au pointeur
  holoStrength?: number // 0 → 1
}>(), {
  size: 'md',
  interactive: true,
  holoStrength: 1
})

const WIDTHS = { sm: 132, md: 208, lg: 280, xl: 360 }

const reduced = usePreferredReducedMotion()
const motionOn = computed(() => reduced.value !== 'reduce')

// L'état possédé vient de la carte elle-même (DomainOwnedCard.owned) ; une
// DomainCard « catalogue » est considérée possédée pour l'affichage.
const owned = computed(() => ('owned' in props.card ? props.card.owned : true))
const grad = computed(() => TYPE_GRADIENT[props.card.type] ?? { c1: '#efe6d6', c2: '#cbb99a' })
const rarity = computed(() => RARITY_META[props.card.rarity])
const isShiny = computed(() => props.card.isShiny)

const cardBg = computed(() => `linear-gradient(162deg, ${grad.value.c1} 0%, ${grad.value.c2} 100%)`)
const holoBase = computed(() => {
  const s = Math.max(0, Math.min(1, props.holoStrength))
  return +(((isShiny.value ? SHINY_HOLO : rarity.value.holo)) * s).toFixed(3)
})
const holoAnimated = computed(() =>
  motionOn.value && (isShiny.value || props.card.rarity === 'Épique' || props.card.rarity === 'Légendaire'))
const frameColor = computed(() => (isShiny.value ? '#c9b3ff' : rarity.value.color))
const shadow = computed(() => hexA(frameColor.value, 0.3))
const gems = computed(() => Array.from({ length: rarity.value.gems }, (_, i) => i))
const hp = computed(() => cosmeticHp(props.card.num, props.card.rarity))
const setNo = computed(() => 'N°' + String(props.card.num).padStart(3, '0'))
const stage = computed(() => STAGE_LABEL[props.card.level] ?? '')

const rootStyle = computed(() => ({
  '--w': WIDTHS[props.size] + 'px',
  '--frame': frameColor.value,
  '--shadow': shadow.value,
  '--type-c2': grad.value.c2
}))

// ─── Tilt / holo / glare au pointeur (repris de Mochidex) ───
const root = ref<HTMLElement>()
const holoEl = ref<HTMLElement>()
const glareEl = ref<HTMLElement>()

function onMove(e: PointerEvent) {
  if (!props.interactive || !motionOn.value || !root.value) return
  const r = root.value.getBoundingClientRect()
  const px = (e.clientX - r.left) / r.width
  const py = (e.clientY - r.top) / r.height
  const rx = (0.5 - py) * 14
  const ry = (px - 0.5) * 14
  root.value.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.05)`
  if (holoEl.value) {
    holoEl.value.style.backgroundPosition = `${px * 100}% ${py * 100}%`
    holoEl.value.style.opacity = String(Math.min(1, holoBase.value + 0.4))
  }
  if (glareEl.value) {
    glareEl.value.style.opacity = '1'
    glareEl.value.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,.6), transparent 55%)`
  }
}
function onLeave() {
  if (!root.value) return
  root.value.style.transform = ''
  if (holoEl.value) holoEl.value.style.opacity = ''
  if (glareEl.value) glareEl.value.style.opacity = '0'
}
</script>

<template>
  <div
    ref="root"
    class="holo"
    :class="[`holo--${size}`, { 'holo--locked': !owned, 'holo--shiny': isShiny }]"
    :style="rootStyle"
    @pointermove="onMove"
    @pointerleave="onLeave"
  >
    <!-- Face en dégradé de type -->
    <div
      class="holo__face"
      :style="{ background: cardBg }"
    >
      <!-- En-tête : nom + PV -->
      <div class="holo__head">
        <span class="holo__name">{{ card.name }}</span>
        <span
          v-if="owned"
          class="holo__hp"
        >{{ hp }}<small>PV</small></span>
      </div>

      <!-- Fenêtre d'illustration -->
      <div class="holo__art">
        <div class="holo__art-bg" />
        <img
          :src="card.imageUrl"
          :alt="card.name"
          class="holo__sprite"
          :class="{ 'holo__sprite--locked': !owned }"
          loading="lazy"
          decoding="async"
        >
        <!-- couche holographique (mobile au pointeur) -->
        <div
          ref="holoEl"
          class="holo__sheen"
          :class="{ 'holo__sheen--anim': holoAnimated }"
          :style="{ opacity: holoBase }"
          aria-hidden="true"
        />
        <span
          v-if="isShiny && owned"
          class="holo__shiny-star"
          aria-hidden="true"
        >✦</span>
        <span
          v-if="isNew && owned"
          class="holo__new"
        >Nouveau</span>
        <span
          v-if="owned && quantity && quantity > 1"
          class="holo__qty"
        >×{{ quantity }}</span>
        <span
          v-if="!owned"
          class="holo__lock"
          aria-hidden="true"
        >?</span>
      </div>

      <!-- Type + gemmes de rareté -->
      <div class="holo__meta">
        <span
          class="holo__type"
          :style="{ background: grad.c2 }"
        >{{ card.type }}</span>
        <span class="holo__gems">
          <i
            v-for="g in gems"
            :key="g"
            :style="{ background: rarity.bar }"
          />
        </span>
      </div>

      <!-- Pied : n° / biome / stage -->
      <div class="holo__foot">
        <span>{{ setNo }} · {{ card.biome }}</span>
        <span>{{ stage }}</span>
      </div>

      <!-- reflet radial (glare) -->
      <div
        ref="glareEl"
        class="holo__glare"
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<style scoped>
.holo {
  width: var(--w);
  aspect-ratio: 63 / 88;
  border-radius: calc(var(--w) * 0.075);
  transform-style: preserve-3d;
  transition: transform .3s cubic-bezier(.3, .9, .3, 1);
  will-change: transform;
  font-family: 'Nunito', system-ui, sans-serif;
}
.holo__face {
  position: relative;
  height: 100%;
  border-radius: inherit;
  padding: calc(var(--w) * 0.055);
  display: flex;
  flex-direction: column;
  gap: calc(var(--w) * 0.03);
  border: max(2px, calc(var(--w) * 0.02)) solid rgba(255, 255, 255, .72);
  box-shadow:
    0 calc(var(--w) * 0.05) calc(var(--w) * 0.11) var(--shadow),
    0 calc(var(--w) * 0.015) calc(var(--w) * 0.03) rgba(80, 60, 40, .18),
    inset 0 2px 0 rgba(255, 255, 255, .45);
  overflow: hidden;
}
.holo--locked .holo__face { filter: saturate(.35) brightness(.98); }
.holo--shiny .holo__face {
  border-color: transparent;
  background-clip: padding-box;
}
.holo--shiny .holo__face::before {
  content: "";
  position: absolute;
  inset: calc(var(--w) * -0.02);
  z-index: -1;
  border-radius: inherit;
  background: conic-gradient(from 0deg, #b6f0e0, #cbaeff, #ffd86b, #ff9ec4, #7fd6d6, #b6f0e0);
  filter: saturate(1.1);
}

/* En-tête */
.holo__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: calc(var(--w) * 0.02);
  color: #4a3f35;
}
.holo__name {
  font-family: 'Fredoka', sans-serif;
  font-weight: 700;
  font-size: calc(var(--w) * 0.082);
  line-height: 1.05;
  letter-spacing: -.01em;
  text-shadow: 0 1px 0 rgba(255, 255, 255, .4);
}
.holo__hp {
  font-family: 'Fredoka', sans-serif;
  font-weight: 700;
  font-size: calc(var(--w) * 0.072);
  color: #c2543f;
  white-space: nowrap;
}
.holo__hp small { font-size: .62em; margin-left: .12em; opacity: .8; }

/* Illustration */
.holo__art {
  position: relative;
  flex: 1;
  border-radius: calc(var(--w) * 0.05);
  overflow: hidden;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .5), inset 0 calc(var(--w) * 0.02) calc(var(--w) * 0.05) rgba(70, 50, 40, .18);
}
.holo__art-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 90% at 50% 22%, rgba(255, 255, 255, .55), rgba(255, 255, 255, .12) 60%, rgba(255, 255, 255, 0));
}
.holo__sprite {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: calc(var(--w) * 0.04);
  filter: drop-shadow(0 calc(var(--w) * 0.02) calc(var(--w) * 0.02) rgba(60, 40, 30, .25));
}
.holo__sprite--locked { filter: brightness(0) opacity(.28); }

.holo__sheen {
  position: absolute;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: overlay;
  background:
    linear-gradient(115deg, rgba(255, 255, 255, 0) 22%, rgba(255, 244, 205, .6) 36%, rgba(198, 240, 255, .6) 46%, rgba(255, 208, 240, .6) 56%, rgba(206, 255, 220, .55) 66%, rgba(255, 255, 255, 0) 80%);
  background-size: 260% 260%;
  background-position: 50% 50%;
  transition: opacity .3s ease;
}
.holo__sheen--anim { animation: holoShine 3.2s linear infinite; }

.holo__glare {
  position: absolute;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: screen;
  opacity: 0;
  border-radius: inherit;
  transition: opacity .3s ease;
}

.holo__shiny-star {
  position: absolute;
  top: calc(var(--w) * 0.03);
  right: calc(var(--w) * 0.04);
  font-size: calc(var(--w) * 0.09);
  color: #fff;
  text-shadow: 0 0 calc(var(--w) * 0.03) #ffd86b, 0 1px 2px rgba(0, 0, 0, .3);
}
.holo__new {
  position: absolute;
  top: calc(var(--w) * 0.035);
  left: calc(var(--w) * 0.04);
  font-family: 'Fredoka', sans-serif;
  font-weight: 700;
  font-size: calc(var(--w) * 0.05);
  color: #fff;
  background: linear-gradient(150deg, #8fd6a8, #5bbf82);
  padding: calc(var(--w) * 0.012) calc(var(--w) * 0.035);
  border-radius: 999px;
  box-shadow: 0 2px 6px rgba(70, 140, 90, .4);
}
.holo__qty {
  position: absolute;
  bottom: calc(var(--w) * 0.035);
  right: calc(var(--w) * 0.04);
  font-family: 'Fredoka', sans-serif;
  font-weight: 700;
  font-size: calc(var(--w) * 0.055);
  color: #4a3f35;
  background: rgba(255, 255, 255, .8);
  padding: calc(var(--w) * 0.008) calc(var(--w) * 0.03);
  border-radius: 999px;
}
.holo__lock {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: 'Fredoka', sans-serif;
  font-weight: 700;
  font-size: calc(var(--w) * 0.24);
  color: rgba(74, 63, 53, .35);
}

/* Type + gemmes */
.holo__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--w) * 0.02);
}
.holo__type {
  font-family: 'Fredoka', sans-serif;
  font-weight: 600;
  font-size: calc(var(--w) * 0.052);
  color: #fff;
  padding: calc(var(--w) * 0.012) calc(var(--w) * 0.05);
  border-radius: 999px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, .18), inset 0 1px 0 rgba(255, 255, 255, .3);
  text-shadow: 0 1px 1px rgba(0, 0, 0, .18);
}
.holo__gems { display: inline-flex; gap: calc(var(--w) * 0.015); }
.holo__gems i {
  width: calc(var(--w) * 0.045);
  height: calc(var(--w) * 0.045);
  border-radius: calc(var(--w) * 0.012);
  transform: rotate(45deg);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .5), 0 1px 2px rgba(0, 0, 0, .2);
}

/* Pied */
.holo__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--w) * 0.02);
  font-weight: 700;
  font-size: calc(var(--w) * 0.046);
  color: rgba(74, 63, 53, .66);
}

@keyframes holoShine {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
</style>
