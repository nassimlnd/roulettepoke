<script setup lang="ts">
import type { DomainCard } from '~/types/domain'

// Scène plein écran « rencontre shiny » (façon combat) : assombrissement →
// Poké Ball qui tremble → flash → éclat d'étoiles + rayons → la carte holo
// (foil cosmos) se matérialise. Cinématique ~2,5 s, skippable au toucher.
const props = defineProps<{ card: DomainCard }>()
const emit = defineEmits<{ done: [] }>()

const prefs = usePreferencesStore()
const sound = useSound()
const reduced = computed(() => prefs.effectiveReducedMotion)
const isLegendary = computed(() => props.card.rarity === 'Légendaire')

const show = ref(false)
const phase = ref<'intro' | 'burst' | 'card'>('intro')
const ready = ref(false)

useViewportLock(() => show.value)

let timers: ReturnType<typeof setTimeout>[] = []
const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms))
function clearTimers() {
  timers.forEach(clearTimeout)
  timers = []
}

function playFanfare() {
  sound.resume()
  sound.fanfare(isLegendary.value ? 'shiny-legendary' : 'shiny')
}

onMounted(() => {
  show.value = true
  // Préchauffe le sprite pendant l'intro (~1 s) pour qu'il soit prêt quand la
  // carte se matérialise (l'image de la carte est en lazy-loading).
  if (typeof Image !== 'undefined' && props.card.imageUrl) {
    const img = new Image()
    img.src = props.card.imageUrl
  }
  if (reduced.value) {
    phase.value = 'card'
    ready.value = true
    playFanfare()
    return
  }
  at(1000, () => {
    phase.value = 'burst'
    playFanfare()
  })
  at(1250, () => {
    phase.value = 'card'
  })
  at(2450, () => {
    ready.value = true
  })
})
onBeforeUnmount(clearTimers)

// Toucher n'importe où avant la fin → saute directement à la carte.
function skip() {
  if (ready.value) return
  clearTimers()
  if (phase.value === 'intro') playFanfare()
  phase.value = 'card'
  ready.value = true
}

// Fermeture : on masque (fondu de sortie) puis on remonte l'événement.
let closing = false
function close() {
  if (closing) return
  closing = true
  clearTimers()
  show.value = false
  at(320, () => emit('done'))
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sr">
      <div
        v-if="show"
        class="sr"
        :class="{ 'sr--still': reduced, 'sr--leg': isLegendary }"
        role="dialog"
        aria-label="Nouveau Pokémon chromatique"
        @click="skip"
      >
        <!-- Rayons + halo derrière la carte -->
        <div
          v-if="phase === 'card'"
          class="sr__rays"
        />
        <div
          v-if="phase === 'card'"
          class="sr__stars"
        >
          <span
            v-for="s in 16"
            :key="s"
            class="sr__star"
            :style="{ '--i': s }"
          />
        </div>

        <!-- Poké Ball d'anticipation -->
        <div
          v-if="phase !== 'card'"
          class="sr__orb"
          :class="{ 'sr__orb--shake': phase === 'intro' }"
        >
          <span class="sr__orb-halo" />
          <PokeBall :size="112" />
        </div>

        <!-- Flash -->
        <div
          v-if="phase === 'burst'"
          class="sr__flash"
        />

        <!-- Carte matérialisée -->
        <div
          v-if="phase === 'card'"
          class="sr__card"
        >
          <span class="sr__banner font-display">
            <UIcon
              name="i-lucide-sparkles"
              class="size-4"
            />
            {{ isLegendary ? 'SHINY LÉGENDAIRE' : 'SHINY' }}
            <UIcon
              name="i-lucide-sparkles"
              class="size-4"
            />
          </span>
          <div class="sr__cardwrap">
            <HoloCard
              :card="card"
              size="lg"
              :is-new="true"
              :interactive="false"
            />
          </div>
          <p class="sr__name font-display">
            {{ card.name }}
          </p>
          <p class="sr__sub">
            {{ card.rarity }} · {{ card.type }} · chromatique ✦
          </p>
        </div>

        <Transition name="sr-rise">
          <button
            v-if="ready"
            class="sr__continue font-display"
            @click.stop="close"
          >
            Continuer
          </button>
        </Transition>
        <p
          v-if="!ready"
          class="sr__hint"
        >
          Touche pour passer
        </p>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sr {
  position: fixed;
  inset: 0;
  z-index: 65;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 20px;
  background: radial-gradient(120% 90% at 50% 42%, #2a1a52 0%, #0a0616 72%);
}
.sr--leg { background: radial-gradient(120% 90% at 50% 42%, #4a2a10 0%, #0a0616 72%); }

/* ── Poké Ball ── */
.sr__orb {
  position: relative;
  display: grid;
  place-items: center;
  animation: srOrbIn .45s var(--ease-pop) both;
}
.sr__orb--shake { animation: srOrbIn .45s var(--ease-pop) both, srShake .14s ease-in-out .5s 3; }
.sr__orb-halo {
  position: absolute;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 236, 170, .55), transparent 68%);
  animation: srPulse 1s ease-in-out infinite;
}

/* ── Flash ── */
.sr__flash {
  position: absolute;
  inset: 0;
  background: #fff;
  animation: srFlash .5s ease-out both;
  pointer-events: none;
}

/* ── Rayons ── */
.sr__rays {
  position: absolute;
  width: 170vmax;
  height: 170vmax;
  background: repeating-conic-gradient(from 0deg, rgba(255, 255, 255, .13) 0deg 5deg, transparent 5deg 17deg);
  animation: srSpin 16s linear infinite;
  -webkit-mask: radial-gradient(circle, #000 6%, transparent 60%);
  mask: radial-gradient(circle, #000 6%, transparent 60%);
  pointer-events: none;
}
.sr--leg .sr__rays { background: repeating-conic-gradient(from 0deg, rgba(255, 214, 130, .2) 0deg 5deg, transparent 5deg 17deg); }

/* ── Étoiles qui giclent ── */
.sr__stars { position: absolute; inset: 0; pointer-events: none; }
.sr__star {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #fff6d8;
  box-shadow: 0 0 10px #ffe8a0;
  --a: calc(var(--i) * 22.5deg);
  animation: srStar 1.15s ease-out both;
}

/* ── Carte ── */
.sr__card {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  animation: srCardIn .7s var(--ease-pop) both;
}
.sr__banner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: .84rem;
  letter-spacing: .16em;
  color: #1a1030;
  padding: 6px 18px;
  border-radius: 999px;
  background: linear-gradient(100deg, #ffe9a8, #b6f0e0, #cbaeff, #ff9ec4, #ffe9a8);
  background-size: 220% 100%;
  box-shadow: 0 6px 20px -6px rgba(203, 174, 255, .7);
  animation: srBannerShine 3s linear infinite;
}
.sr__cardwrap {
  border-radius: 22px;
  animation: srGlow 2.2s ease-in-out infinite;
}
.sr__name { font-weight: 800; font-size: 1.7rem; color: #fff; text-shadow: 0 2px 12px rgba(203, 174, 255, .6); }
.sr__sub { font-weight: 700; font-size: .86rem; color: rgba(255, 255, 255, .72); margin-top: -4px; }

/* ── Continuer / hint ── */
.sr__continue {
  position: absolute;
  bottom: calc(30px + env(safe-area-inset-bottom));
  z-index: 3;
  font-weight: 700;
  font-size: 1rem;
  color: #3a1e5c;
  background: #fff;
  padding: 12px 34px;
  border-radius: 14px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, .3);
  transition: transform .14s var(--ease-pop);
}
.sr__continue:hover { transform: translateY(-2px); }
.sr__continue:active { transform: translateY(1px); box-shadow: 0 2px 0 rgba(0, 0, 0, .3); }
.sr__hint {
  position: absolute;
  bottom: calc(26px + env(safe-area-inset-bottom));
  font-size: .78rem;
  font-weight: 600;
  color: rgba(255, 255, 255, .5);
}

/* ── Keyframes ── */
@keyframes srOrbIn { 0% { opacity: 0; transform: scale(.3); } 100% { opacity: 1; transform: scale(1); } }
@keyframes srShake { 0%, 100% { transform: rotate(-13deg); } 50% { transform: rotate(13deg); } }
@keyframes srPulse { 0%, 100% { opacity: .5; transform: scale(.9); } 50% { opacity: 1; transform: scale(1.12); } }
@keyframes srFlash { 0% { opacity: 0; } 16% { opacity: 1; } 100% { opacity: 0; } }
@keyframes srSpin { to { transform: rotate(360deg); } }
@keyframes srStar {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(.2); }
  18% { opacity: 1; }
  100% { opacity: 0; transform: translate(calc(-50% + cos(var(--a)) * 44vmin), calc(-50% + sin(var(--a)) * 44vmin)) scale(.5); }
}
@keyframes srCardIn {
  0% { opacity: 0; transform: scale(.35) rotate(-16deg); filter: blur(6px); }
  55% { opacity: 1; filter: blur(0); }
  72% { transform: scale(1.08) rotate(4deg); }
  100% { opacity: 1; transform: scale(1) rotate(0); }
}
@keyframes srGlow {
  0%, 100% { box-shadow: 0 0 30px -6px rgba(203, 174, 255, .5); }
  50% { box-shadow: 0 0 54px 4px rgba(203, 174, 255, .8); }
}
@keyframes srBannerShine { to { background-position: 220% 0; } }

.sr-enter-active { transition: opacity .35s ease; }
.sr-enter-from { opacity: 0; }
.sr-leave-active { transition: opacity .3s ease; }
.sr-leave-to { opacity: 0; }
.sr-rise-enter-active { transition: opacity .3s ease, transform .3s var(--ease-pop); }
.sr-rise-enter-from { opacity: 0; transform: translateY(12px); }

/* Mouvement réduit : rendu figé (carte + bandeau, sans animation). */
.sr--still :deep(*), .sr--still::before, .sr--still::after { animation: none !important; }
@media (prefers-reduced-motion: reduce) {
  .sr__orb, .sr__orb--shake, .sr__orb-halo, .sr__flash, .sr__rays, .sr__star, .sr__card, .sr__cardwrap, .sr__banner { animation: none !important; }
  .sr-enter-active, .sr-leave-active, .sr-rise-enter-active { transition: none; }
}
</style>
