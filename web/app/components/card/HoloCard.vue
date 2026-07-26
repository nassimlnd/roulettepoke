<script setup lang="ts">
import type { DomainCard, DomainOwnedCard } from '~/types/domain'
import { TYPE_GRADIENT, RARITY_META, SHINY_HOLO, SHINY_LOCKED_BG, SHINY_LOCKED_HOLO, hexA, cosmeticHp, STAGE_LABEL } from '~/utils/cardTheme'

// Carte holographique — direction « Mochidex » adaptée à nos vraies données.
// Dégradé de face par type, gemmes de rareté, holo + tilt/glare au pointeur.
const props = withDefaults(defineProps<{
  card: DomainCard | DomainOwnedCard
  size?: 'sm' | 'md' | 'lg' | 'xl'
  quantity?: number
  isNew?: boolean
  interactive?: boolean // tilt/glare au pointeur
  holoStrength?: number // 0 → 1
  ambient?: boolean // scintillement holo continu (couper dans les grilles denses)
  animated?: boolean // sprite animé (détail au clic) au lieu du WebP statique
}>(), {
  size: 'md',
  interactive: true,
  holoStrength: 1,
  ambient: true,
  animated: false
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

// Un shiny verrouillé ne révèle ni son sprite ni ses couleurs : il prend une
// teinte irisée UNIQUE plutôt que le dégradé de son type (cf. SHINY_LOCKED_BG).
const shinyLocked = computed(() => isShiny.value && !owned.value)
const cardBg = computed(() => (shinyLocked.value
  ? SHINY_LOCKED_BG
  : `linear-gradient(162deg, ${grad.value.c1} 0%, ${grad.value.c2} 100%)`))
const holoBase = computed(() => {
  const s = Math.max(0, Math.min(1, props.holoStrength))
  const base = shinyLocked.value
    ? SHINY_LOCKED_HOLO
    : (isShiny.value ? SHINY_HOLO : rarity.value.holo)
  return +(base * s).toFixed(3)
})
// Scintillement continu : seulement si `ambient` (coupé dans la collection pour
// éviter des dizaines d'animations mix-blend simultanées = lag). Au repos sans
// ambient, la carte reste un foil STATIQUE (aucun coût par frame) ; le survol
// réactive le holo via le pointeur.
const holoAnimated = computed(() =>
  motionOn.value && props.ambient && (isShiny.value || props.card.rarity === 'Épique' || props.card.rarity === 'Légendaire'))
const frameColor = computed(() => (isShiny.value ? '#c9b3ff' : rarity.value.color))
const shadow = computed(() => hexA(frameColor.value, 0.3))
const gems = computed(() => Array.from({ length: rarity.value.gems }, (_, i) => i))
const hp = computed(() => cosmeticHp(props.card.num, props.card.rarity))
const setNo = computed(() => 'N°' + String(props.card.num).padStart(3, '0'))
const stage = computed(() => STAGE_LABEL[props.card.level] ?? '')

// ─── Sprite : statique (grilles) ou animé (détail au clic) ───
// Le GIF animé vient d'un CDN externe. On ne l'affiche QU'APRÈS l'avoir
// préchargé avec succès : on ne substitue jamais une image dont on ignore si
// elle arrivera. Sans ce précaution, un CDN lent ou injoignable laisse la
// fenêtre d'illustration VIDE (la requête pend, `error` ne se déclenche pas).
// Ici, le WebP statique du backend reste affiché et l'animation ne fait que
// s'y substituer si elle est prête — dégradation invisible.
const ANIM_PRELOAD_TIMEOUT = 4000
const animReady = ref(false)

watch(
  () => [props.animated, props.card.id] as const,
  () => {
    animReady.value = false
    if (!props.animated || !import.meta.client) return
    const url = animatedSpriteUrl(props.card.num, isShiny.value)
    if (!url) return
    const img = new Image()
    // Abandon au-delà du délai : on n'attend pas indéfiniment un CDN muet.
    const timer = setTimeout(() => {
      img.src = ''
    }, ANIM_PRELOAD_TIMEOUT)
    img.onload = () => {
      clearTimeout(timer)
      animReady.value = true
    }
    img.onerror = () => clearTimeout(timer)
    img.src = url
  },
  { immediate: true }
)

const spriteUrl = computed(() => (animReady.value
  ? animatedSpriteUrl(props.card.num, isShiny.value)!
  : props.card.imageUrl))

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
const foilEl = ref<HTMLElement>()

function onMove(e: PointerEvent) {
  if (!props.interactive || !motionOn.value || !root.value) return
  const r = root.value.getBoundingClientRect()
  const px = (e.clientX - r.left) / r.width
  const py = (e.clientY - r.top) / r.height
  const rx = (0.5 - py) * 14
  const ry = (px - 0.5) * 14
  // `will-change` activé UNIQUEMENT pendant l'interaction (pas en permanence sur
  // 150 cartes → évite autant de couches de composition inutiles).
  root.value.style.willChange = 'transform'
  root.value.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.05)`
  if (holoEl.value) {
    holoEl.value.style.backgroundPosition = `${px * 100}% ${py * 100}%`
    holoEl.value.style.opacity = String(Math.min(1, holoBase.value + 0.4))
  }
  if (foilEl.value) foilEl.value.style.backgroundPosition = `${px * 100}% ${py * 100}%`
  if (glareEl.value) {
    glareEl.value.style.opacity = '1'
    glareEl.value.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,.6), transparent 55%)`
  }
}
function onLeave() {
  if (!root.value) return
  root.value.style.transform = ''
  root.value.style.willChange = 'auto'
  if (holoEl.value) holoEl.value.style.opacity = ''
  if (foilEl.value) foilEl.value.style.backgroundPosition = ''
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
          :src="spriteUrl"
          :alt="card.name"
          class="holo__sprite"
          :class="{ 'holo__sprite--locked': !owned, 'holo__sprite--pixel': animReady }"
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

      <!-- Foil holographique pleine carte (shiny) : voile irisé arc-en-ciel qui
           couvre toute la carte. Statique par défaut, animé si `ambient`. -->
      <div
        v-if="isShiny && owned"
        ref="foilEl"
        class="holo__foil"
        :class="{ 'holo__foil--anim': holoAnimated }"
        aria-hidden="true"
      />

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
  /* `will-change` n'est PAS déclaré ici : le poser en permanence créerait une
     couche de composition par carte (≈150 dans la collection). Il est activé au
     survol via onMove() et retiré au départ. */
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
  /* Au-dessus du foil shiny (z-index 1) : le sprite `_alt` porte DÉJÀ les vraies
     couleurs du shiny, il ne doit pas être repeint par le voile arc-en-ciel.
     Seul le cadre est irisé — principe d'une carte « reverse holo ». */
  z-index: 2;
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
/* Les GIF animés Gen 5 sont de petits sprites (≈ 33×40) : agrandis, ils doivent
   rester du pixel art net et non un flou interpolé. */
.holo__sprite--pixel { image-rendering: pixelated; }

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
  /* Au-dessus de l'illustration (z-index 2) : le reflet au pointeur doit
     balayer TOUTE la carte, artwork compris. */
  z-index: 3;
  pointer-events: none;
  mix-blend-mode: screen;
  opacity: 0;
  border-radius: inherit;
  transition: opacity .3s ease;
}

/* Foil holographique pleine carte (shiny) : arc-en-ciel irisé qui couvre TOUTE
   la carte. Deux couches : `color-dodge` (stries lumineuses saturées, le vrai
   « holo ») + `overlay` (voile pastel doux via ::after). STATIQUE par défaut
   (aucun coût par frame) ; animé seulement si `--anim` (révélation, scène). */
.holo__foil {
  position: absolute;
  inset: 0;
  /* Sous la fenêtre d'illustration (z-index 2) : le foil habille le CADRE, pas
     l'artwork. */
  z-index: 1;
  pointer-events: none;
  border-radius: inherit;
  /* `soft-light` TEINTE en préservant la teinte d'origine. (`color` remplaçait
     la teinte de tout ce qui était dessous — le sprite shiny finissait coupé en
     deux blocs violet/vert, cf. régression signalée.) */
  mix-blend-mode: color;
  opacity: .6;
  background: linear-gradient(115deg,
    #ff5a3c 4%, #ffcf3c 18%, #8cff64 32%, #3cffd7 46%, #3c9cff 60%, #b45aff 74%, #ff5ad2 88%, #ff5a3c 98%);
  /* SANS répétition : un dégradé incliné ne se raccorde jamais aux bords de
     tuile → c'était la couture verticale nette au milieu de la carte. Une seule
     tuile, plus large que la carte, que l'animation fait glisser. */
  background-repeat: no-repeat;
  background-size: 300% 300%;
  background-position: 50% 50%;
}
/* Stries lumineuses (gloss) par-dessus la teinte → aspect « foil » brillant. */
.holo__foil::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  mix-blend-mode: screen;
  opacity: .5;
  background: linear-gradient(115deg,
    transparent 26%, rgba(255, 255, 255, .38) 40%, rgba(255, 255, 255, .68) 50%, rgba(255, 255, 255, .38) 60%, transparent 74%);
  background-repeat: no-repeat;
  background-size: 300% 300%;
  background-position: 50% 50%;
}
/* Course propre à `no-repeat` (0→100 %), contrairement à holoShine (tuilé). */
.holo__foil--anim, .holo__foil--anim::after { animation: foilShine 4.2s linear infinite alternate; }

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

/* Foil shiny : fond `no-repeat` de 300 % → la course utile va de 0 à 100 %
   (au-delà, la tuile sortirait du cadre). `alternate` évite le saut de retour. */
@keyframes foilShine {
  0% { background-position: 0% 50%; }
  100% { background-position: 100% 50%; }
}
</style>
