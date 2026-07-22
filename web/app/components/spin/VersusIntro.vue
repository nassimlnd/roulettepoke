<script setup lang="ts">
// Transition « Combat » — reprise fidèle de l'écran d'arène conçu pour le
// Mochidex (fond soleil crème, bannières rouge/bleu inclinées, emblème « VS »
// à ressort, éclat + flash). Les « mochi » sont remplacés par les sprites :
// à gauche le Pokémon du joueur, à droite le portrait du dresseur adverse.
//
// Séquence : phase « in » (créatures + bannières glissent, le VS surgit avec
// éclat et flash) → maintien → phase « out » (tout ressort, l'overlay se fond).
// L'arène de combat est montée derrière l'overlay au début du « out » (`reveal`)
// puis révélée quand l'overlay disparaît (`done`).
type Side = { name: string, img: string, sprite: boolean, sub: string }
defineProps<{
  me: Side
  foe: Side
  heading: string
  round: string
  dots: { total: number, current: number }
}>()
const emit = defineEmits<{ reveal: [], done: [] }>()
const reduced = usePreferredReducedMotion()

const phase = ref<'in' | 'out'>('in')
const meBroken = ref(false)
const foeBroken = ref(false)

let t1: ReturnType<typeof setTimeout>
let t2: ReturnType<typeof setTimeout>
onMounted(() => {
  const mo = reduced.value !== 'reduce'
  const IN = mo ? 700 : 20
  const HOLD = mo ? 820 : 20
  const OUT = mo ? 560 : 20
  t1 = setTimeout(() => {
    phase.value = 'out'
    emit('reveal')
  }, IN + HOLD)
  t2 = setTimeout(() => emit('done'), IN + HOLD + OUT)
})
onBeforeUnmount(() => {
  clearTimeout(t1)
  clearTimeout(t2)
})
</script>

<template>
  <Teleport to="body">
    <div
      class="vsx"
      :class="phase === 'out' ? 'is-out' : 'is-in'"
      aria-hidden="true"
    >
      <!-- Fond : soleil crème qui tourne + halo central -->
      <div class="vsx__sun" />
      <div class="vsx__glow" />

      <!-- Titre -->
      <div class="vsx__title">
        <div class="vsx__title-a font-display">
          {{ heading }}
        </div>
        <div class="vsx__title-b">
          {{ round }}
        </div>
      </div>

      <!-- GAUCHE : Pokémon du joueur -->
      <div class="vsx__side vsx__side--l">
        <div
          class="vsx__slide is-l"
          :class="phase === 'out' ? 'is-out' : 'is-in'"
        >
          <div class="vsx__lunge is-l">
            <div class="vsx__float">
              <div class="vsx__disc">
                <div class="vsx__glowdisc vsx__glowdisc--l" />
                <img
                  v-if="!meBroken"
                  class="vsx__sprite"
                  :src="me.img"
                  :alt="me.name"
                  @error="meBroken = true"
                >
                <UIcon
                  v-else
                  name="i-lucide-circle-dot"
                  class="vsx__ph"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- DROITE : dresseur adverse (ou Pokémon) -->
      <div class="vsx__side vsx__side--r">
        <div
          class="vsx__slide is-r"
          :class="phase === 'out' ? 'is-out' : 'is-in'"
        >
          <div class="vsx__lunge is-r">
            <div class="vsx__float">
              <div class="vsx__disc">
                <div class="vsx__glowdisc vsx__glowdisc--r" />
                <img
                  v-if="!foeBroken"
                  class="vsx__sprite"
                  :src="foe.img"
                  :alt="foe.name"
                  @error="foeBroken = true"
                >
                <UIcon
                  v-else
                  :name="foe.sprite ? 'i-lucide-circle-dot' : 'i-lucide-user-round'"
                  class="vsx__ph"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bannière ROUGE (gauche) -->
      <div class="vsx__banner vsx__banner--l">
        <div
          class="vsx__slide is-l"
          :class="phase === 'out' ? 'is-out' : 'is-in'"
        >
          <div class="vsx__skew vsx__skew--l">
            <div class="vsx__unskew vsx__unskew--l">
              <div class="vsx__name font-display">
                {{ me.name }}
              </div>
              <div class="vsx__sub">
                {{ me.sub }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bannière BLEUE (droite) -->
      <div class="vsx__banner vsx__banner--r">
        <div
          class="vsx__slide is-r"
          :class="phase === 'out' ? 'is-out' : 'is-in'"
        >
          <div class="vsx__skew vsx__skew--r">
            <div class="vsx__unskew vsx__unskew--r">
              <div class="vsx__name font-display">
                {{ foe.name }}
              </div>
              <div class="vsx__sub">
                {{ foe.sub }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Emblème VS + éclat -->
      <div class="vsx__vsroot">
        <div
          v-if="phase === 'in'"
          class="vsx__ring"
        />
        <div
          class="vsx__vs"
          :class="phase === 'out' ? 'is-out' : 'is-in'"
        >
          <div class="vsx__vs-inner font-display">
            <span class="vsx__v">V</span><span class="vsx__s">S</span>
          </div>
        </div>
      </div>

      <!-- Flash -->
      <div
        v-if="phase === 'in'"
        class="vsx__flash"
      />

      <!-- Points de progression (combats de l'aventure) -->
      <div class="vsx__dots">
        <span
          v-for="i in dots.total"
          :key="i"
          class="vsx__dot"
          :class="{ 'is-current': i - 1 === dots.current }"
        />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.vsx {
  position: fixed;
  inset: 0;
  z-index: 70;
  overflow: hidden;
  pointer-events: none;
  background: radial-gradient(circle at 50% 44%, #241f33 0%, #15121e 52%, #0b0910 100%);
  font-family: Nunito, var(--font-body, system-ui), sans-serif;
}
.vsx.is-out { animation: vsxFade .56s ease-in both; }

.vsx__sun {
  position: absolute;
  inset: -45%;
  background: repeating-conic-gradient(from 0deg at 50% 50%, rgba(255, 255, 255, .015) 0deg 3.4deg, rgba(180, 170, 224, .06) 3.4deg 6.8deg);
  opacity: .9;
  animation: sunSpin 80s linear infinite;
}
.vsx__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 46%, rgba(255, 240, 214, .22) 3%, rgba(255, 214, 170, .08) 24%, transparent 58%);
}

/* Titre */
.vsx__title { position: absolute; top: 5%; left: 0; right: 0; text-align: center; z-index: 6; }
.vsx__title-a { font-weight: 700; font-size: clamp(15px, 2.4vmin, 24px); letter-spacing: .5vmin; color: #e7cfa0; }
.vsx__title-b { font-weight: 800; font-size: clamp(11px, 1.6vmin, 15px); letter-spacing: .3vmin; color: #b3a082; margin-top: 2px; }

/* Créatures (sprites) — grandes, juste au-dessus de leur bannière-nom */
.vsx__side { position: absolute; transform: translateY(-50%); width: clamp(190px, 37vmin, 410px); z-index: 4; }
.vsx__side--l { left: 2%; top: 40%; }
.vsx__side--r { right: 2%; top: 48%; }
.vsx__lunge.is-l { animation: lungeL 2s ease-in-out infinite; }
.vsx__lunge.is-r { animation: lungeR 2s ease-in-out infinite; }
.vsx__float { animation: bob 3.4s ease-in-out infinite; }
.vsx__disc { position: relative; width: 100%; aspect-ratio: 1; }
.vsx__glowdisc { position: absolute; inset: -8%; border-radius: 50%; }
.vsx__glowdisc--l { background: radial-gradient(circle, rgba(232, 80, 106, .4), transparent 66%); }
.vsx__glowdisc--r { background: radial-gradient(circle, rgba(63, 155, 214, .4), transparent 66%); }
.vsx__sprite {
  position: absolute;
  inset: 3%;
  width: 94%;
  height: 94%;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 14px 16px rgba(58, 47, 40, .34));
}
.vsx__ph { position: absolute; inset: 22%; width: 56%; height: 56%; color: #b0a084; }

/* Bannières inclinées */
.vsx__banner { position: absolute; width: 56%; transform: translateY(-50%); z-index: 5; }
.vsx__banner--l { left: 2%; top: 62%; }
.vsx__banner--r { right: 2%; top: 70%; }
.vsx__skew {
  border-radius: 8px;
  box-shadow: 12px 12px 0 rgba(74, 63, 53, .14), 0 8px 22px rgba(210, 60, 80, .4);
  padding: clamp(10px, 1.8vmin, 20px) clamp(20px, 4vmin, 52px);
  border-top: 3px solid rgba(255, 255, 255, .4);
  transform: skewX(-13deg);
}
.vsx__skew--l { background: linear-gradient(180deg, #ef5a6e, #d8384f); }
.vsx__skew--r { background: linear-gradient(180deg, #4faee2, #2f8ccb); box-shadow: 12px 12px 0 rgba(74, 63, 53, .14), 0 8px 22px rgba(47, 140, 203, .4); }
.vsx__unskew { transform: skewX(13deg); }
.vsx__unskew--l { text-align: left; padding-left: 6%; padding-right: 22%; }
.vsx__unskew--r { text-align: right; padding-right: 6%; padding-left: 22%; }
.vsx__name {
  font-weight: 700;
  font-size: clamp(20px, 3.6vmin, 44px);
  line-height: 1;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, .25);
  letter-spacing: .4vmin;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
}
.vsx__sub { font-weight: 800; font-size: clamp(10px, 1.5vmin, 15px); letter-spacing: .2vmin; color: rgba(255, 255, 255, .9); margin-top: .5vmin; text-transform: uppercase; }

/* Emblème VS */
.vsx__vsroot { position: absolute; left: 50%; top: 66%; width: 0; height: 0; z-index: 7; }
.vsx__ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: clamp(120px, 22vmin, 240px);
  height: clamp(120px, 22vmin, 240px);
  border-radius: 50%;
  border: .9vmin solid #ffd86b;
  transform: translate(-50%, -50%);
  animation: ringBurst .7s ease-out .34s both;
  pointer-events: none;
}
.vsx__vs { position: absolute; left: 50%; top: 50%; }
.vsx__vs.is-in { animation: vsPop .55s cubic-bezier(.2, .8, .25, 1.5) .32s both; }
.vsx__vs.is-out { animation: vsOut .35s ease-in both; }
.vsx__vs-inner {
  display: flex;
  align-items: center;
  font-weight: 700;
  font-size: clamp(52px, 11vmin, 128px);
  line-height: .8;
  filter: drop-shadow(0 8px 14px rgba(0, 0, 0, .35));
}
.vsx__v { color: #fff; -webkit-text-stroke: .9vmin #d8384f; padding-right: .4vmin; }
.vsx__s { color: #fff; -webkit-text-stroke: .9vmin #2f8ccb; margin-left: -.6vmin; }

/* Flash */
.vsx__flash { position: absolute; inset: 0; background: #fffdf9; pointer-events: none; z-index: 8; animation: vsFlash 1s ease-out both; }

/* Points de progression */
.vsx__dots { position: absolute; bottom: 6%; left: 0; right: 0; display: flex; gap: 10px; justify-content: center; z-index: 9; }
.vsx__dot { width: 10px; height: 10px; border-radius: 10px; background: #e3d3ba; transition: all .4s ease; }
.vsx__dot.is-current { width: 26px; background: linear-gradient(90deg, #ef5a6e, #4faee2); }

@keyframes sunSpin { to { transform: rotate(360deg); } }
@keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6%); } }
@keyframes lungeL { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(13%); } }
@keyframes lungeR { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-13%); } }
@keyframes slideInL { 0% { transform: translateX(-130%); opacity: 0; } 68% { opacity: 1; } 84% { transform: translateX(3%); } 100% { transform: translateX(0); opacity: 1; } }
@keyframes slideInR { 0% { transform: translateX(130%); opacity: 0; } 68% { opacity: 1; } 84% { transform: translateX(-3%); } 100% { transform: translateX(0); opacity: 1; } }
@keyframes slideOutL { 0% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(-130%); opacity: 0; } }
@keyframes slideOutR { 0% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(130%); opacity: 0; } }
@keyframes vsPop { 0% { transform: translate(-50%, -50%) scale(0) rotate(-40deg); opacity: 0; } 55% { transform: translate(-50%, -50%) scale(1.28) rotate(8deg); opacity: 1; } 74% { transform: translate(-50%, -50%) scale(.92) rotate(-4deg); } 100% { transform: translate(-50%, -50%) scale(1) rotate(-4deg); opacity: 1; } }
@keyframes vsOut { 0% { transform: translate(-50%, -50%) scale(1) rotate(-4deg); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(0) rotate(34deg); opacity: 0; } }
@keyframes vsFlash { 0%, 100% { opacity: 0; } 7% { opacity: .92; } 42% { opacity: 0; } }
@keyframes ringBurst { 0% { transform: translate(-50%, -50%) scale(.2); opacity: .85; } 100% { transform: translate(-50%, -50%) scale(2.6); opacity: 0; } }
@keyframes vsxFade { to { opacity: 0; } }

/* Les glissements dépendent de la phase (in/out) et du côté (l/r). */
.vsx__slide.is-l.is-in { animation: slideInL .7s cubic-bezier(.16, .8, .28, 1) both; }
.vsx__slide.is-r.is-in { animation: slideInR .7s cubic-bezier(.16, .8, .28, 1) both; }
.vsx__slide.is-l.is-out { animation: slideOutL .5s ease-in both; }
.vsx__slide.is-r.is-out { animation: slideOutR .5s ease-in both; }

@media (prefers-reduced-motion: reduce) {
  .vsx.is-out { animation: none; opacity: 0; }
  .vsx__sun, .vsx__float, .vsx__lunge.is-l, .vsx__lunge.is-r { animation: none; }
  .vsx__ring, .vsx__flash { display: none; }
  .vsx__slide.is-l.is-in, .vsx__slide.is-r.is-in, .vsx__slide.is-l.is-out, .vsx__slide.is-r.is-out { animation: none; }
  .vsx__vs.is-in, .vsx__vs.is-out { animation: none; transform: translate(-50%, -50%) rotate(-4deg); }
}
</style>
