<script setup lang="ts">
import { useSpinStore } from '~/stores/spin'
import type { AdvChoice, AdvNode } from '~/types/domain'

// Aventure plein écran (overlay immersif, façon combat). Présente chaque étape
// (dresseur + dialogue, coffre, repos, légendaire) avec des transitions ; les
// combats passent par un flash « Combat contre X ! » puis le BattleStage.
const spin = useSpinStore()
const reduced = usePreferredReducedMotion()

// Masque la gouttière de scrollbar réservée tant que l'aventure est à l'écran.
useViewportLock(() => spin.phase !== 'idle')

type Step = 'intro' | 'action' | 'resolving' | 'reaction' | 'reward' | 'evolving'
const step = ref<Step>('intro')
const speaker = ref('')
const lines = ref<string[]>([])
const chestOpen = ref(false)
const throwing = ref(false)
const portraitBroken = ref(false)

// Transition « Combat » (écran d'arène façon Mochidex, composant VersusIntro).
type VersusSide = { name: string, img: string, sprite: boolean, sub: string }
type VersusData = {
  me: VersusSide
  foe: VersusSide
  heading: string
  round: string
  dots: { total: number, current: number }
}
const vs = ref<VersusData | null>(null)
let vsNode: AdvNode | null = null
let vsBattle: Promise<boolean> | null = null

function versusFrom(n: AdvNode): VersusData {
  const me = spin.starter
  const combats = spin.nodes.filter(x => x.kind === 'elite' || x.kind === 'champion' || x.kind === 'wild')
  const cur = Math.max(0, combats.indexOf(n))
  const foe: VersusSide = n.trainer
    ? { name: n.trainer.name, img: n.trainer.portraitUrl ?? '', sprite: false, sub: n.opponent?.type ?? '' }
    : { name: n.opponent?.name ?? '', img: n.opponent?.imageUrl ?? '', sprite: true, sub: n.opponent?.type ?? '' }
  return {
    me: { name: me?.name ?? 'Toi', img: me?.imageUrl ?? '', sprite: true, sub: me?.type ?? '' },
    foe,
    heading: 'AVENTURE',
    round: `COMBAT ${cur + 1} / ${combats.length}`,
    dots: { total: combats.length, current: cur }
  }
}

// Relais piloté par le composant : `reveal` (début du « out ») monte l'arène
// derrière l'overlay ; `done` retire l'overlay → l'arène est révélée.
function onVsReveal() {
  if (vsNode) vsBattle = spin.fight(vsNode)
}
async function onVsDone() {
  vs.value = null
  const n = vsNode
  vsNode = null
  const won = vsBattle ? await vsBattle : false
  vsBattle = null
  if (!won) return // défaite : le store bascule en game over
  if (n?.trainer) {
    speaker.value = n.trainer.name
    lines.value = [n.trainer.concede]
    step.value = 'reaction'
  } else {
    present() // dresseur de route (sans dialogue) : on avance
  }
}

const node = computed(() => spin.current)
const tc = computed(() => node.value?.themeColor || '#8b5cc4')
const isTrainer = computed(() => node.value?.kind === 'elite' || node.value?.kind === 'champion')

const ICON: Record<AdvNode['kind'], string> = {
  start: 'i-lucide-flag', elite: 'i-lucide-swords', champion: 'i-lucide-crown',
  treasure: 'i-lucide-gift', legendary: 'i-lucide-sparkles',
  wild: 'i-lucide-user-round', camp: 'i-lucide-tent', evolve: 'i-lucide-sparkles', fork: 'i-lucide-signpost'
}
function pip(i: number): string {
  if (i < spin.index) return 'done'
  if (i === spin.index) return 'current'
  return ''
}

// Nœuds à CTA unique (les nœuds à choix passent par `choices` + onChoice).
const cta = computed(() => {
  const k = node.value?.kind
  if (k === 'start') return { label: 'Avancer', icon: 'i-lucide-chevron-right' }
  if (k === 'elite') return { label: 'Combattre', icon: 'i-lucide-swords' }
  if (k === 'champion') return { label: 'Défier le Champion', icon: 'i-lucide-crown' }
  if (k === 'legendary') return { label: 'Tenter la capture', icon: 'i-lucide-sparkles' }
  return { label: 'Ouvrir le coffre', icon: 'i-lucide-gift' }
})

// Options d'un nœud à choix (carrefour, dresseur de route, camp, autel).
const choices = computed<AdvChoice[] | null>(() => {
  const n = node.value
  if (!n) return null
  if (n.kind === 'fork') return (n.paths ?? []).map((p, i) => ({ key: `path:${i}`, label: p.label, icon: p.icon, desc: p.desc }))
  if (n.kind === 'wild') return [
    { key: 'fight', label: 'Combattre', icon: 'i-lucide-swords', desc: `${spin.currentChance} % de victoire · +45 XP` },
    { key: 'skip', label: 'Éviter', icon: 'i-lucide-footprints', desc: 'Passer sans risque' }
  ]
  if (n.kind === 'camp') return [
    { key: 'rest', label: 'Repos', icon: 'i-lucide-tent', desc: '+8 % au prochain combat' },
    { key: 'train', label: 'Entraînement', icon: 'i-lucide-dumbbell', desc: '+50 XP — vers l\'évolution' },
    { key: 'forge', label: 'Forge', icon: 'i-lucide-hammer', desc: spin.heldItem ? 'Renforce ton objet (+2 %)' : 'Fabrique un objet tenu' }
  ]
  if (n.kind === 'evolve') return spin.canEvolve
    ? [
        { key: 'evolve', label: `Évoluer en ${spin.nextForm?.name}`, icon: 'i-lucide-sparkles', desc: `${spin.starter?.name} est prêt à évoluer !` },
        { key: 'delay', label: 'Retarder', icon: 'i-lucide-hand', desc: '+12 % au prochain combat' }
      ]
    : [{ key: 'delay', label: 'Puiser l\'énergie', icon: 'i-lucide-sparkles', desc: `+12 % — évolution au niveau ${spin.evolvesAt[spin.stage] ?? '?'}` }]
  return null
})

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, reduced.value === 'reduce' ? Math.min(ms, 40) : ms))

function present() {
  const n = node.value
  chestOpen.value = false
  throwing.value = false
  portraitBroken.value = false
  vs.value = null
  if (!n) return
  speaker.value = n.trainer?.name ?? ''
  lines.value = n.trainer?.intro ?? n.narration ?? ['…']
  step.value = 'intro'
}

function onDialogueDone() {
  if (step.value === 'intro') step.value = 'action'
  else if (step.value === 'reaction') present()
}

// Après la révélation de la récompense : on avance enfin au nœud suivant.
function onRewardDone() {
  spin.advancePast()
  present()
}

// Après la révélation d'évolution.
function onEvolveDone() {
  spin.advancePast()
  present()
}

// Choix d'un nœud (carrefour, dresseur de route, camp, autel).
async function onChoice(key: string) {
  const n = node.value
  if (!n || step.value !== 'action') return
  if (key.startsWith('path:')) {
    step.value = 'resolving'
    spin.chooseFork(Number(key.slice(5)))
    present()
    return
  }
  if (n.kind === 'wild') {
    if (key === 'skip') {
      step.value = 'resolving'
      spin.advancePast()
      present()
      return
    }
    step.value = 'resolving'
    vsNode = n
    vs.value = versusFrom(n)
    return
  }
  if (n.kind === 'camp') {
    if (key === 'rest') spin.campRest()
    else if (key === 'train') spin.campTrain()
    else spin.campForge()
    step.value = 'reward'
    return
  }
  if (n.kind === 'evolve') {
    if (key === 'evolve') {
      spin.doEvolve()
      step.value = 'evolving'
      return
    }
    spin.autelChannel()
    step.value = 'reward'
  }
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
    // Écran d'arène « Combat » ; le relais vers le BattleStage est piloté par
    // les évènements du composant (onVsReveal / onVsDone).
    vsNode = n
    vs.value = versusFrom(n)
    return
  }
  if (n.kind === 'treasure') {
    chestOpen.value = true
    await wait(750)
    spin.openTreasure() // applique le bonus + prépare la récompense (sans avancer)
    step.value = 'reward' // révélation « en grand »
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

        <!-- Bandeau du starter (croissance visible) -->
        <StarterHud v-if="spin.phase === 'map'" />

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
              v-if="step !== 'reward' && step !== 'evolving'"
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
                v-else-if="node.kind === 'wild' && node.opponent"
                class="wild"
              >
                <span class="wild__aura" />
                <img
                  :src="node.opponent.imageUrl"
                  :alt="node.opponent.name"
                  class="wild__mon"
                >
                <span class="wild__plate">
                  <b class="font-display">{{ node.opponent.name }}</b>
                  <i>Pokémon du dresseur</i>
                </span>
              </div>

              <div
                v-else-if="node.kind === 'camp'"
                class="event"
              >
                <span class="campfire">🔥</span>
              </div>

              <div
                v-else-if="node.kind === 'evolve'"
                class="altar"
              >
                <span class="altar__aura" />
                <UIcon
                  name="i-lucide-sparkles"
                  class="altar__ico"
                />
              </div>

              <div
                v-else-if="node.kind === 'fork'"
                class="forkscene"
              >
                <UIcon
                  name="i-lucide-signpost"
                  class="forkscene__ico"
                />
              </div>

              <div
                v-else-if="node.kind === 'treasure'"
                class="event"
              >
                <span
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
            <div
              v-if="choices"
              class="choices"
            >
              <button
                v-for="c in choices"
                :key="c.key"
                class="choice"
                :disabled="c.disabled"
                @click="onChoice(c.key)"
              >
                <UIcon
                  :name="c.icon"
                  class="choice__ico"
                />
                <span class="choice__label font-display">{{ c.label }}</span>
                <span
                  v-if="c.desc"
                  class="choice__desc"
                >{{ c.desc }}</span>
              </button>
            </div>
            <PButton
              v-else
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
          <RewardReveal
            v-else-if="step === 'reward' && spin.lastReward"
            :reward="spin.lastReward"
            @continue="onRewardDone"
          />
          <EvolveReveal
            v-else-if="step === 'evolving' && spin.evolution"
            :from="spin.evolution.from"
            :to="spin.evolution.to"
            @done="onEvolveDone"
          />
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

        <!-- ═══ Transition « Combat » (écran d'arène façon Mochidex) ═══ -->
        <VersusIntro
          v-if="vs"
          :me="vs.me"
          :foe="vs.foe"
          :heading="vs.heading"
          :round="vs.round"
          :dots="vs.dots"
          @reveal="onVsReveal"
          @done="onVsDone"
        />
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
.gate__ico { width: 88px; height: 88px; color: color-mix(in oklab, var(--tc) 62%, #4a3f4a); }

/* Dresseur de route : le Pokémon adverse */
.wild { position: relative; display: grid; place-items: center; }
.wild__aura { position: absolute; width: 168px; height: 168px; border-radius: 50%; background: radial-gradient(circle, color-mix(in oklab, var(--tc) 45%, transparent), transparent 70%); animation: pulse 1.8s ease-in-out infinite; }
.wild__mon { position: relative; width: 148px; height: 148px; object-fit: contain; image-rendering: pixelated; filter: drop-shadow(0 8px 10px rgba(40, 30, 30, .35)); animation: floatY 3s ease-in-out infinite; }
.wild__plate {
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
.wild__plate b { font-weight: 700; font-size: .95rem; color: var(--ui-text-highlighted); }
.wild__plate i { font-style: normal; font-size: .68rem; font-weight: 700; color: var(--tc); filter: brightness(.8); }

/* Autel d'évolution */
.altar { position: relative; display: grid; place-items: center; }
.altar__aura { position: absolute; width: 156px; height: 156px; border-radius: 50%; background: radial-gradient(circle, color-mix(in oklab, var(--tc) 52%, transparent), transparent 66%); animation: pulse 1.8s ease-in-out infinite; }
.altar__ico { position: relative; width: 90px; height: 90px; color: color-mix(in oklab, var(--tc) 64%, #3a2f4a); animation: floatY 3s ease-in-out infinite; }

/* Carrefour */
.forkscene { display: grid; place-items: center; }
.forkscene__ico { width: 96px; height: 96px; color: color-mix(in oklab, var(--tc) 60%, #4a3f4a); }

.acta { display: flex; justify-content: center; }

/* Grille de choix (carrefour, dresseur de route, camp, autel) */
.choices { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 420px; margin: 0 auto; }
.choice {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 13px;
  align-items: center;
  text-align: left;
  padding: 12px 16px;
  border-radius: 16px;
  background: var(--ui-bg-elevated);
  border: 2px solid color-mix(in oklab, var(--tc) 42%, #3a2f2a);
  box-shadow: 0 4px 0 rgba(58, 47, 42, .16);
  transition: transform .14s var(--ease-pop), box-shadow .14s;
  cursor: pointer;
}
.choice:hover { transform: translateY(-2px); box-shadow: 0 6px 0 rgba(58, 47, 42, .16); }
.choice:disabled { opacity: .5; cursor: not-allowed; }
.choice__ico { grid-row: 1 / 3; width: 32px; height: 32px; color: var(--tc); filter: brightness(.82); }
.choice__label { font-weight: 700; font-size: 1rem; color: var(--ui-text-highlighted); }
.choice__desc { font-size: .8rem; color: var(--ui-text-muted); }
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

/* Transitions */
.astage-enter-active, .astage-leave-active { transition: opacity .3s ease; }
.astage-enter-from, .astage-leave-to { opacity: 0; }
.swap-enter-active { transition: opacity .35s ease, transform .35s var(--ease-pop); }
.swap-leave-active { transition: opacity .2s ease, transform .2s ease; }
.swap-enter-from { opacity: 0; transform: translateY(18px) scale(.96); }
.swap-leave-to { opacity: 0; transform: translateY(-12px) scale(.98); }

@keyframes floatY { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes pulse { 0%, 100% { transform: scale(.9); opacity: .55; } 50% { transform: scale(1.1); opacity: .9; } }
@keyframes flicker { 0%, 100% { transform: scale(1) rotate(-2deg); } 50% { transform: scale(1.08) rotate(2deg); } }
@keyframes burst { to { opacity: 0; transform: translate(calc(cos(var(--a)) * 48px), calc(sin(var(--a)) * 48px)) scale(.3); } }
@keyframes shrink { to { transform: scale(.15); opacity: .2; } }
@keyframes toss { 0% { transform: translate(-70px, -50px) scale(.6); } 55% { transform: translate(0, 0) scale(1); } 70%, 100% { transform: translate(0, 6px) rotate(12deg); } }

@media (prefers-reduced-motion: reduce) {
  .trainer__ace, .legend__mon, .legend__aura, .campfire { animation: none; }
  .swap-enter-active, .swap-leave-active, .astage-enter-active, .astage-leave-active { transition: none; }
}
</style>
