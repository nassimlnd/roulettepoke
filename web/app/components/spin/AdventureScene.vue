<script setup lang="ts">
import { useSpinStore } from '~/stores/spin'
import type { AdvNode } from '~/types/domain'

// Aventure plein écran (overlay immersif, façon combat). Présente chaque étape
// (dresseur + dialogue, coffre, repos, légendaire) avec des transitions ; les
// combats passent par un flash « Combat contre X ! » puis le BattleStage.
const spin = useSpinStore()
const reduced = usePreferredReducedMotion()

type Step = 'intro' | 'action' | 'resolving' | 'reaction'
const step = ref<Step>('intro')
const speaker = ref('')
const lines = ref<string[]>([])
const chestOpen = ref(false)
const throwing = ref(false)
const portraitBroken = ref(false)
const vs = ref(false)
const vsName = ref('')

const node = computed(() => spin.current)
const tc = computed(() => node.value?.themeColor || '#8b5cc4')
const isTrainer = computed(() => node.value?.kind === 'elite' || node.value?.kind === 'champion')
const isCamp = computed(() => node.value?.kind === 'treasure' && !!node.value.title.includes('camp'))

const ICON: Record<AdvNode['kind'], string> = {
  start: 'i-lucide-flag', elite: 'i-lucide-swords', champion: 'i-lucide-crown',
  treasure: 'i-lucide-gift', legendary: 'i-lucide-sparkles'
}
function pip(i: number): string {
  if (i < spin.index) return 'done'
  if (i === spin.index) return 'current'
  return ''
}

const cta = computed(() => {
  const k = node.value?.kind
  if (k === 'start') return { label: 'Avancer', icon: 'i-lucide-chevron-right' }
  if (k === 'elite') return { label: 'Combattre', icon: 'i-lucide-swords' }
  if (k === 'champion') return { label: 'Défier le Champion', icon: 'i-lucide-crown' }
  if (k === 'legendary') return { label: 'Tenter la capture', icon: 'i-lucide-sparkles' }
  return isCamp.value ? { label: 'Se reposer', icon: 'i-lucide-flame' } : { label: 'Ouvrir le coffre', icon: 'i-lucide-gift' }
})

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, reduced.value === 'reduce' ? Math.min(ms, 40) : ms))

function present() {
  const n = node.value
  chestOpen.value = false
  throwing.value = false
  portraitBroken.value = false
  vs.value = false
  if (!n) return
  speaker.value = n.trainer?.name ?? ''
  lines.value = n.trainer?.intro ?? n.narration ?? ['…']
  step.value = 'intro'
}

function onDialogueDone() {
  if (step.value === 'intro') step.value = 'action'
  else if (step.value === 'reaction') present()
}

async function onCta() {
  const n = node.value
  if (!n || step.value !== 'action') return
  step.value = 'resolving'

  if (n.kind === 'start') {
    spin.advancePast()
    present()
    return
  }
  if (n.kind === 'elite' || n.kind === 'champion') {
    // Transition « Combat contre X ! » (tremblement + flash) puis le combat.
    vsName.value = n.trainer?.name ?? n.opponent?.name ?? ''
    vs.value = true
    await wait(1050)
    vs.value = false
    const trainer = n.trainer
    const won = await spin.fight(n)
    if (won && trainer) {
      speaker.value = trainer.name
      lines.value = [trainer.concede]
      step.value = 'reaction'
    }
    return
  }
  if (n.kind === 'treasure') {
    chestOpen.value = true
    await wait(900)
    spin.openTreasure()
    speaker.value = ''
    lines.value = [spin.lastTreasure]
    step.value = 'reaction'
    return
  }
  if (n.kind === 'legendary') {
    throwing.value = true
    await wait(1100)
    await spin.attemptLegendary(n)
  }
}

watch(() => spin.phase, (p) => {
  if (p === 'map') present()
})
onMounted(() => {
  if (spin.phase === 'map') present()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="astage">
      <div
        v-if="spin.phase !== 'idle'"
        class="astage"
        :style="{ '--tc': tc }"
      >
        <!-- Progression -->
        <ol class="atrail">
          <li
            v-for="(n, i) in spin.nodes"
            :key="i"
            class="apip"
            :class="pip(i)"
          >
            <UIcon
              :name="ICON[n.kind]"
              class="size-3"
            />
          </li>
        </ol>

        <!-- ═══ Parcours ═══ -->
        <div
          v-if="spin.phase === 'map' && node"
          class="astage__body"
        >
          <Transition
            name="swap"
            mode="out-in"
          >
            <div
              :key="spin.index"
              class="scene"
            >
              <span class="scene__chapter font-display">{{ node.title }}</span>

              <div
                v-if="isTrainer && node.trainer"
                class="trainer"
              >
                <span class="trainer__portrait">
                  <img
                    v-if="node.trainer.portraitUrl && !portraitBroken"
                    :src="node.trainer.portraitUrl"
                    :alt="node.trainer.name"
                    @error="portraitBroken = true"
                  >
                  <UIcon
                    v-else
                    name="i-lucide-user-round"
                    class="trainer__silhouette"
                  />
                </span>
                <img
                  v-if="node.opponent"
                  :src="node.opponent.imageUrl"
                  :alt="node.opponent.name"
                  class="trainer__ace"
                >
                <span class="trainer__plate">
                  <b class="font-display">{{ node.trainer.name }}</b>
                  <i>{{ node.trainer.title }}</i>
                </span>
              </div>

              <div
                v-else-if="node.kind === 'treasure'"
                class="event"
              >
                <span
                  v-if="isCamp"
                  class="campfire"
                >🔥</span>
                <span
                  v-else
                  class="chest"
                  :class="{ 'chest--open': chestOpen }"
                >
                  <span class="chest__lid" />
                  <span class="chest__body" />
                  <span
                    v-for="s in 6"
                    :key="s"
                    class="chest__spark"
                    :style="{ '--i': s }"
                  />
                </span>
              </div>

              <div
                v-else-if="node.kind === 'legendary'"
                class="legend"
                :class="{ 'legend--throw': throwing }"
              >
                <span class="legend__aura" />
                <img
                  v-if="node.opponent"
                  :src="node.opponent.imageUrl"
                  :alt="node.opponent.name"
                  class="legend__mon"
                >
                <span
                  v-if="throwing"
                  class="legend__ball"
                >🔴</span>
              </div>

              <div
                v-else
                class="gate"
              >
                <UIcon
                  name="i-lucide-castle"
                  class="gate__ico"
                />
              </div>
            </div>
          </Transition>

          <DialogueBox
            v-if="step === 'intro' || step === 'reaction'"
            :key="`${spin.index}-${step}`"
            :speaker="speaker"
            :lines="lines"
            @done="onDialogueDone"
          />
          <div
            v-else-if="step === 'action'"
            class="acta"
          >
            <PButton
              color="primary"
              size="lg"
              @click="onCta"
            >
              <UIcon
                :name="cta.icon"
                class="size-5"
              /> {{ cta.label }}
              <span
                v-if="node.baseWinChance"
                class="acta__odds tabular"
              >{{ spin.currentChance }} %</span>
            </PButton>
          </div>
          <div
            v-else
            class="acta__wait"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="size-6 animate-spin"
            />
          </div>

          <button
            class="aquit"
            @click="spin.reset()"
          >
            Abandonner l'aventure
          </button>
        </div>

        <!-- ═══ Victoire ═══ -->
        <div
          v-else-if="spin.phase === 'victory'"
          class="verdict verdict--win"
        >
          <span class="verdict__badge">🏆</span>
          <p class="verdict__title font-display">
            Aventure réussie !
          </p>
          <p
            v-if="spin.rewardCoins"
            class="verdict__coins"
          >
            <UIcon
              name="i-lucide-coins"
              class="size-5"
            /> +{{ spin.rewardCoins }} 🪙
          </p>
          <div
            v-if="spin.legendaryResult"
            class="leg"
            :class="spin.legendaryResult.captured ? 'leg--win' : 'leg--miss'"
          >
            <span class="leg__frame">
              <img
                :src="spin.legendaryResult.mon.imageUrl"
                :alt="spin.legendaryResult.mon.name"
              >
            </span>
            <p class="leg__t font-display">
              {{ spin.legendaryResult.captured ? `${spin.legendaryResult.mon.name} capturé ! ✨` : 'Le légendaire s\'est échappé…' }}
            </p>
            <p class="leg__s">
              {{ spin.legendaryResult.captured
                ? (spin.legendaryResult.transferred ? 'Il rejoint ta collection !' : 'Capturé — mais pas transféré cette fois.')
                : 'Reviens tenter ta chance.' }}
            </p>
          </div>
          <div class="verdict__actions">
            <button
              class="astage__continue"
              @click="spin.renew()"
            >
              Nouvelle aventure
            </button>
            <button
              class="aquit"
              @click="spin.reset()"
            >
              Quitter
            </button>
          </div>
        </div>

        <!-- ═══ Défaite ═══ -->
        <div
          v-else
          class="verdict verdict--lose"
        >
          <UIcon
            name="i-lucide-shield-x"
            class="verdict__ko size-10"
          />
          <p class="verdict__title font-display">
            Aventure terminée
          </p>
          <p
            v-if="spin.lostTo"
            class="verdict__quote"
          >
            « {{ spin.lostTo.taunt }} »<br><span>— {{ spin.lostTo.name }}</span>
          </p>
          <p class="verdict__sub">
            Tentatives illimitées — retente ta chance !
          </p>
          <div class="verdict__actions">
            <button
              class="astage__continue"
              @click="spin.renew()"
            >
              Recommencer
            </button>
            <button
              class="aquit"
              @click="spin.reset()"
            >
              Quitter
            </button>
          </div>
        </div>

        <!-- ═══ Transition « Combat ! » ═══ -->
        <Transition name="vsfade">
          <div
            v-if="vs"
            class="vs"
          >
            <span class="vs__streak" />
            <span class="vs__lead font-display">Combat contre</span>
            <span class="vs__name font-display">{{ vsName }} !</span>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.astage {
  position: fixed;
  inset: 0;
  z-index: 55;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 22px 18px calc(22px + env(safe-area-inset-bottom));
  overflow-y: auto;
  background: radial-gradient(120% 90% at 50% 12%, color-mix(in oklab, var(--tc) 40%, #171015) 0%, #120d12 78%);
}
.astage__body { width: 100%; max-width: 620px; margin: auto; display: flex; flex-direction: column; gap: 18px; }

/* Progression compacte (sur fond sombre) */
.atrail { list-style: none; margin: 0; padding: 0; display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
.apip {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  color: rgba(255, 255, 255, .5);
  background: rgba(255, 255, 255, .12);
}
.apip.done { color: #fff; background: linear-gradient(150deg, #8fd6a8, #5bbf82); }
.apip.current { color: #fff; background: linear-gradient(150deg, #ee5a48, var(--color-poke-500)); transform: scale(1.15); box-shadow: 0 0 0 3px rgba(255, 255, 255, .18); }

/* Boîte de scène (claire, sur le fond sombre — cohérent avec l'arène) */
.scene {
  position: relative;
  min-height: 250px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  padding: 20px;
  border: 3px solid color-mix(in oklab, var(--tc) 55%, #3a2f2a);
  background: radial-gradient(120% 100% at 50% 0%, color-mix(in oklab, var(--tc) 32%, #fff) 0%, color-mix(in oklab, var(--tc) 60%, #eceaf0) 100%);
}
.scene__chapter {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  font-weight: 800;
  font-size: .74rem;
  color: #fff;
  background: color-mix(in oklab, #3a2f2a 62%, var(--tc));
  padding: 4px 14px;
  border-radius: 999px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, .22);
}

.trainer { position: relative; display: flex; align-items: center; gap: 8px; }
.trainer__portrait {
  display: grid;
  place-items: center;
  width: 108px;
  height: 108px;
  border-radius: 24px;
  background: radial-gradient(circle at 50% 35%, color-mix(in oklab, var(--tc) 22%, #fff), color-mix(in oklab, var(--tc) 42%, #fff));
  border: 3px solid #fff;
  box-shadow: 0 8px 18px -8px rgba(0, 0, 0, .45);
  overflow: hidden;
}
.trainer__portrait img { width: 100%; height: 100%; object-fit: contain; padding: 5px; image-rendering: auto; }
.trainer__silhouette { width: 62px; height: 62px; color: color-mix(in oklab, var(--tc) 40%, #6a5a6a); }
.trainer__ace { width: 132px; height: 132px; object-fit: contain; filter: drop-shadow(0 8px 10px rgba(40, 30, 30, .3)); animation: floatY 3s ease-in-out infinite; }
.trainer__plate {
  position: absolute;
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  white-space: nowrap;
  background: var(--ui-bg-elevated);
  border: 2px solid color-mix(in oklab, var(--tc) 50%, #3a2f2a);
  padding: 4px 16px;
  border-radius: 12px;
  box-shadow: 0 3px 0 rgba(58, 47, 42, .16);
}
.trainer__plate b { font-weight: 700; font-size: .95rem; color: var(--ui-text-highlighted); }
.trainer__plate i { font-style: normal; font-size: .68rem; font-weight: 700; color: var(--tc); filter: brightness(.8); }

.event { display: grid; place-items: center; }
.campfire { font-size: 4.4rem; animation: flicker 1.4s ease-in-out infinite; }
.chest { position: relative; width: 100px; height: 78px; }
.chest__body { position: absolute; bottom: 0; width: 100px; height: 54px; border-radius: 8px 8px 12px 12px; background: linear-gradient(#c98a3a, #a06a24); border: 3px solid #7a5019; }
.chest__lid { position: absolute; top: 0; width: 100px; height: 36px; border-radius: 12px 12px 4px 4px; background: linear-gradient(#e0a94a, #c98a3a); border: 3px solid #7a5019; transform-origin: bottom center; transition: transform .4s var(--ease-pop); z-index: 2; }
.chest--open .chest__lid { transform: rotateX(115deg); }
.chest__spark { position: absolute; top: 26px; left: 46px; width: 8px; height: 8px; border-radius: 50%; background: #ffe08a; opacity: 0; }
.chest--open .chest__spark { animation: burst .7s ease-out .2s forwards; --a: calc(var(--i) * 60deg); }

.legend { position: relative; display: grid; place-items: center; }
.legend__aura { position: absolute; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle, color-mix(in oklab, var(--tc) 55%, transparent), transparent 70%); animation: pulse 1.8s ease-in-out infinite; }
.legend__mon { position: relative; width: 150px; height: 150px; object-fit: contain; filter: drop-shadow(0 0 14px color-mix(in oklab, var(--tc) 60%, transparent)); animation: floatY 3s ease-in-out infinite; }
.legend--throw .legend__mon { animation: shrink .5s ease-in .5s forwards; }
.legend__ball { position: absolute; font-size: 1.9rem; animation: toss 1.1s ease-in forwards; }

.gate { display: grid; place-items: center; }
.gate__ico { width: 88px; height: 88px; color: color-mix(in oklab, var(--tc) 26%, #fff); }

.acta { display: flex; justify-content: center; }
.acta__odds { margin-left: 8px; font-weight: 800; font-size: .82rem; color: #fff; background: rgba(255, 255, 255, .22); padding: 2px 9px; border-radius: 999px; }
.acta__wait { display: grid; place-items: center; padding: 10px; color: #fff; }

.aquit {
  align-self: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .82rem;
  color: rgba(255, 255, 255, .6);
  padding: 4px 10px;
}
.aquit:hover { color: #fff; }

/* Verdict (victoire / défaite) plein écran */
.verdict {
  margin: auto;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 28px 24px;
  border-radius: 22px;
  background: var(--ui-bg-elevated);
  box-shadow: 0 18px 50px -12px rgba(0, 0, 0, .6);
}
.verdict__badge { font-size: 2.8rem; }
.verdict__ko { color: var(--ui-text-dimmed); }
.verdict__title { font-weight: 700; font-size: 1.4rem; color: var(--ui-text-highlighted); }
.verdict--win .verdict__title { color: #c07d10; }
.verdict__sub { font-size: .88rem; color: var(--ui-text-muted); }
.verdict__quote { font-size: .92rem; font-style: italic; color: var(--ui-text-toned); line-height: 1.5; }
.verdict__quote span { font-style: normal; font-weight: 700; font-size: .82rem; color: var(--ui-text-muted); }
.verdict__coins { display: inline-flex; align-items: center; gap: 7px; font-family: var(--font-display); font-weight: 800; color: #b7791f; background: color-mix(in oklab, #f6c453 18%, transparent); padding: 6px 14px; border-radius: 999px; }
.verdict__actions { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 10px; }
.astage__continue {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  color: var(--color-poke-700, #a3271b);
  background: #fff;
  padding: 11px 28px;
  border-radius: 14px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, .18);
  border: 1px solid var(--ui-border);
  transition: transform .14s var(--ease-pop);
}
.astage__continue:hover { transform: translateY(-2px); }

.leg { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-top: 6px; }
.leg__frame { width: 90px; height: 90px; border-radius: 20px; display: grid; place-items: center; overflow: hidden; background: radial-gradient(circle at 50% 30%, color-mix(in oklab, #b57ee0 22%, #fff), color-mix(in oklab, #b57ee0 8%, #fff)); }
.leg--win .leg__frame { box-shadow: 0 0 0 3px #8b5cc4, 0 8px 20px -8px rgba(139, 92, 196, .6); }
.leg--miss .leg__frame { filter: grayscale(.7) opacity(.7); box-shadow: 0 0 0 3px var(--ui-border-accented); }
.leg__frame img { width: 86%; height: 86%; object-fit: contain; }
.leg__t { font-weight: 700; font-size: 1.02rem; color: var(--ui-text-highlighted); margin-top: 4px; }
.leg--win .leg__t { color: #7c4fb0; }
.leg__s { font-size: .8rem; color: var(--ui-text-muted); }

/* Transition « Combat ! » */
.vs {
  position: absolute;
  inset: 0;
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--tc) 55%, #120d12), #0c0810);
  overflow: hidden;
  animation: shake .5s ease-in-out 2;
}
.vs__streak {
  position: absolute;
  inset: -30% -10%;
  background: repeating-linear-gradient(115deg, transparent 0 34px, color-mix(in oklab, var(--tc) 40%, transparent) 34px 40px);
  opacity: .5;
  animation: slideStreak .6s linear infinite;
}
.vs__lead { color: rgba(255, 255, 255, .9); font-weight: 700; font-size: 1.1rem; text-shadow: 0 2px 8px rgba(0, 0, 0, .6); z-index: 1; }
.vs__name {
  color: #fff;
  font-weight: 800;
  font-size: 2.6rem;
  line-height: 1;
  text-shadow: 0 3px 0 color-mix(in oklab, var(--tc) 60%, #000), 0 6px 16px rgba(0, 0, 0, .6);
  z-index: 1;
  animation: slam .5s var(--ease-pop) both;
}

/* Transitions */
.astage-enter-active, .astage-leave-active { transition: opacity .3s ease; }
.astage-enter-from, .astage-leave-to { opacity: 0; }
.swap-enter-active { transition: opacity .35s ease, transform .35s var(--ease-pop); }
.swap-leave-active { transition: opacity .2s ease, transform .2s ease; }
.swap-enter-from { opacity: 0; transform: translateY(18px) scale(.96); }
.swap-leave-to { opacity: 0; transform: translateY(-12px) scale(.98); }
.vsfade-enter-active { transition: opacity .18s ease; }
.vsfade-leave-active { transition: opacity .3s ease; }
.vsfade-enter-from, .vsfade-leave-to { opacity: 0; }

@keyframes floatY { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes pulse { 0%, 100% { transform: scale(.9); opacity: .55; } 50% { transform: scale(1.1); opacity: .9; } }
@keyframes flicker { 0%, 100% { transform: scale(1) rotate(-2deg); } 50% { transform: scale(1.08) rotate(2deg); } }
@keyframes burst { to { opacity: 0; transform: translate(calc(cos(var(--a)) * 48px), calc(sin(var(--a)) * 48px)) scale(.3); } }
@keyframes shrink { to { transform: scale(.15); opacity: .2; } }
@keyframes toss { 0% { transform: translate(-70px, -50px) scale(.6); } 55% { transform: translate(0, 0) scale(1); } 70%, 100% { transform: translate(0, 6px) rotate(12deg); } }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
@keyframes slam { 0% { opacity: 0; transform: scale(2.4); } 60% { opacity: 1; transform: scale(.92); } 100% { transform: scale(1); } }
@keyframes slideStreak { to { transform: translateX(40px); } }

@media (prefers-reduced-motion: reduce) {
  .trainer__ace, .legend__mon, .legend__aura, .campfire { animation: none; }
  .swap-enter-active, .swap-leave-active, .astage-enter-active, .astage-leave-active { transition: none; }
  .vs { animation: none; }
  .vs__name { animation: none; }
  .vs__streak { animation: none; }
}
</style>
