<script setup lang="ts">
import type { TeamMember } from '~/types/domain'
import { TYPE_GRADIENT, RARITY_META, SHINY_HOLO, hexA } from '~/utils/cardTheme'

// Carte de membre d'équipe — même langage visuel que HoloCard (face en dégradé
// de type, gemmes de rareté, holo) mais adaptée aux données réduites d'un membre
// (ni PV, ni n°, ni biome). Sert dans les slots et à la révélation de roulette.
const props = withDefaults(defineProps<{
  member: TeamMember
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  position?: number // n° de slot (1-based) affiché en pastille ; omis = masqué
}>(), {
  size: 'md',
  interactive: true
})

const WIDTHS = { sm: 128, md: 168, lg: 236 }

const reduced = usePreferredReducedMotion()
const motionOn = computed(() => reduced.value !== 'reduce')

const grad = computed(() => TYPE_GRADIENT[props.member.type] ?? { c1: '#efe6d6', c2: '#cbb99a' })
const rarity = computed(() => RARITY_META[props.member.rarity])
const isShiny = computed(() => props.member.isShiny)
const cardBg = computed(() => `linear-gradient(162deg, ${grad.value.c1} 0%, ${grad.value.c2} 100%)`)
const holoBase = computed(() => (isShiny.value ? SHINY_HOLO : rarity.value.holo))
const holoAnimated = computed(() =>
  motionOn.value && (isShiny.value || props.member.rarity === 'Épique' || props.member.rarity === 'Légendaire'))
const frameColor = computed(() => (isShiny.value ? '#c9b3ff' : rarity.value.color))
const gems = computed(() => Array.from({ length: rarity.value.gems }, (_, i) => i))

const rootStyle = computed(() => ({
  '--w': WIDTHS[props.size] + 'px',
  '--frame': frameColor.value,
  '--shadow': hexA(frameColor.value, 0.3)
}))
</script>

<template>
  <div
    class="tcard"
    :class="{ 'tcard--shiny': isShiny, 'tcard--static': !interactive }"
    :style="rootStyle"
  >
    <div
      class="tcard__face"
      :style="{ background: cardBg }"
    >
      <div class="tcard__head">
        <span class="tcard__name">{{ member.name }}</span>
        <span
          v-if="position != null"
          class="tcard__pos"
          aria-hidden="true"
        >{{ position }}</span>
      </div>

      <div class="tcard__art">
        <div class="tcard__art-bg" />
        <img
          :src="member.imageUrl"
          :alt="member.name"
          class="tcard__sprite"
          loading="lazy"
          decoding="async"
        >
        <div
          class="tcard__sheen"
          :class="{ 'tcard__sheen--anim': holoAnimated }"
          :style="{ opacity: holoBase }"
          aria-hidden="true"
        />
        <span
          v-if="isShiny"
          class="tcard__shiny-star"
          aria-hidden="true"
        >✦</span>
      </div>

      <div class="tcard__meta">
        <span
          class="tcard__type"
          :style="{ background: grad.c2 }"
        >{{ member.type }}</span>
        <span class="tcard__gems">
          <i
            v-for="g in gems"
            :key="g"
            :style="{ background: rarity.bar }"
          />
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tcard {
  width: var(--w);
  aspect-ratio: 63 / 88;
  border-radius: calc(var(--w) * 0.075);
  font-family: 'Nunito', system-ui, sans-serif;
  transition: transform .28s var(--ease-pop);
}
.tcard:not(.tcard--static):hover { transform: translateY(-4px) scale(1.02); }
.tcard__face {
  position: relative;
  height: 100%;
  border-radius: inherit;
  padding: calc(var(--w) * 0.06);
  display: flex;
  flex-direction: column;
  gap: calc(var(--w) * 0.035);
  border: max(2px, calc(var(--w) * 0.022)) solid rgba(255, 255, 255, .72);
  box-shadow:
    0 calc(var(--w) * 0.05) calc(var(--w) * 0.11) var(--shadow),
    0 calc(var(--w) * 0.015) calc(var(--w) * 0.03) rgba(80, 60, 40, .18),
    inset 0 2px 0 rgba(255, 255, 255, .45);
  overflow: hidden;
}
.tcard--shiny .tcard__face {
  border-color: transparent;
  background-clip: padding-box;
}
.tcard--shiny .tcard__face::before {
  content: "";
  position: absolute;
  inset: calc(var(--w) * -0.02);
  z-index: -1;
  border-radius: inherit;
  background: conic-gradient(from 0deg, #b6f0e0, #cbaeff, #ffd86b, #ff9ec4, #7fd6d6, #b6f0e0);
}

.tcard__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: calc(var(--w) * 0.02);
  color: #4a3f35;
}
.tcard__name {
  font-family: 'Fredoka', sans-serif;
  font-weight: 700;
  font-size: calc(var(--w) * 0.088);
  line-height: 1.05;
  letter-spacing: -.01em;
  text-shadow: 0 1px 0 rgba(255, 255, 255, .4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tcard__pos {
  flex: none;
  display: grid;
  place-items: center;
  width: calc(var(--w) * 0.15);
  height: calc(var(--w) * 0.15);
  border-radius: 50%;
  background: rgba(255, 255, 255, .82);
  color: #c2543f;
  font-family: 'Fredoka', sans-serif;
  font-weight: 700;
  font-size: calc(var(--w) * 0.08);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .6), 0 1px 3px rgba(0, 0, 0, .15);
}

.tcard__art {
  position: relative;
  flex: 1;
  border-radius: calc(var(--w) * 0.05);
  overflow: hidden;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .5), inset 0 calc(var(--w) * 0.02) calc(var(--w) * 0.05) rgba(70, 50, 40, .18);
}
.tcard__art-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 90% at 50% 22%, rgba(255, 255, 255, .55), rgba(255, 255, 255, .12) 60%, rgba(255, 255, 255, 0));
}
.tcard__sprite {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: calc(var(--w) * 0.05);
  filter: drop-shadow(0 calc(var(--w) * 0.02) calc(var(--w) * 0.02) rgba(60, 40, 30, .25));
}
.tcard__sheen {
  position: absolute;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: overlay;
  background:
    linear-gradient(115deg, rgba(255, 255, 255, 0) 22%, rgba(255, 244, 205, .6) 36%, rgba(198, 240, 255, .6) 46%, rgba(255, 208, 240, .6) 56%, rgba(206, 255, 220, .55) 66%, rgba(255, 255, 255, 0) 80%);
  background-size: 260% 260%;
  background-position: 50% 50%;
}
.tcard__sheen--anim { animation: shineSweep 3.2s linear infinite; }
.tcard__shiny-star {
  position: absolute;
  top: calc(var(--w) * 0.03);
  right: calc(var(--w) * 0.04);
  font-size: calc(var(--w) * 0.1);
  color: #fff;
  text-shadow: 0 0 calc(var(--w) * 0.03) #ffd86b, 0 1px 2px rgba(0, 0, 0, .3);
}

.tcard__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--w) * 0.02);
}
.tcard__type {
  font-family: 'Fredoka', sans-serif;
  font-weight: 600;
  font-size: calc(var(--w) * 0.058);
  color: #fff;
  padding: calc(var(--w) * 0.014) calc(var(--w) * 0.055);
  border-radius: 999px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, .18), inset 0 1px 0 rgba(255, 255, 255, .3);
  text-shadow: 0 1px 1px rgba(0, 0, 0, .18);
}
.tcard__gems { display: inline-flex; gap: calc(var(--w) * 0.018); }
.tcard__gems i {
  width: calc(var(--w) * 0.05);
  height: calc(var(--w) * 0.05);
  border-radius: calc(var(--w) * 0.012);
  transform: rotate(45deg);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .5), 0 1px 2px rgba(0, 0, 0, .2);
}
</style>
