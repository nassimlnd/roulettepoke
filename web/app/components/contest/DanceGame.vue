<script setup lang="ts">
// Répétition de danse (v5.0) : un Simon à quatre panneaux. Chaque manche
// ajoute un pas à la chorégraphie, qu'il faut rejouer en entier ; +2 points de
// concours par manche réussie, 10 manches au plus, UNE tentative. Règles du
// jeu d'origine : « Passer » avant de jouer ne consomme rien ; échouer dès la
// première manche donne une seconde chance (seul le second essai compte) ;
// fermer en pleine partie soumet les manches déjà réussies.
import { DANCE_MAX_ROUNDS, DANCE_POINTS_PER_ROUND } from '~/utils/contest'

const open = defineModel<boolean>('open', { default: false })
/** `null` = passé sans jouer (rien à soumettre). */
const emit = defineEmits<{ done: [rounds: number | null] }>()

const PANELS = [
  { key: 'red', label: 'Échappé et battu' },
  { key: 'blue', label: 'Devant, derrière' },
  { key: 'green', label: 'Dessus, dessous, dessous, dessus' },
  { key: 'yellow', label: 'Briser, voler, briser, voler' }
] as const

const { tick, fanfare } = useSound()
const reduced = usePreferredReducedMotion()
const FLASH_ON = 450
const FLASH_GAP = 200

type Phase = 'intro' | 'show' | 'input' | 'between' | 'second' | 'fail' | 'perfect'
const phase = ref<Phase>('intro')
const sequence = ref<number[]>([])
const round = ref(0)
const inputIdx = ref(0)
const active = ref<number | null>(null)
const hit = ref<number | null>(null)
const roundsDone = ref(0)
const firstGame = ref(true)
let finished = false
let token = 0 // invalide les animations en cours à la fermeture

const wait = (ms: number) => new Promise(r => setTimeout(r, reduced.value === 'reduce' ? Math.min(ms, 120) : ms))

const status = computed(() => {
  switch (phase.value) {
    case 'show': return 'Regarde bien la chorégraphie…'
    case 'input': return 'À toi de jouer !'
    case 'between': return 'Bien ! Manche suivante…'
    case 'second': return 'Raté dès la première manche ! Tu as droit à une seconde chance…'
    case 'fail': return `Raté ! Tu as tenu ${roundsDone.value} manche${roundsDone.value > 1 ? 's' : ''}.`
    case 'perfect': return '🏆 Chorégraphie parfaite !'
    default: return ''
  }
})

function reset() {
  phase.value = 'intro'
  sequence.value = []
  round.value = 0
  inputIdx.value = 0
  active.value = null
  hit.value = null
  roundsDone.value = 0
  firstGame.value = true
  finished = false
  token++
}

function finish(rounds: number | null) {
  if (finished) return
  finished = true
  token++
  emit('done', rounds)
  open.value = false
}

async function playSequence() {
  const my = ++token
  phase.value = 'show'
  await wait(400)
  for (const idx of sequence.value) {
    if (my !== token) return
    active.value = idx
    tick()
    await wait(FLASH_ON)
    active.value = null
    await wait(FLASH_GAP)
  }
  if (my !== token) return
  inputIdx.value = 0
  phase.value = 'input'
}

function nextRound() {
  round.value += 1
  sequence.value = [...sequence.value, Math.floor(Math.random() * PANELS.length)]
  return playSequence()
}

function start() {
  sequence.value = []
  round.value = 0
  roundsDone.value = 0
  return nextRound()
}

async function onPanel(i: number) {
  if (phase.value !== 'input') return
  hit.value = i
  tick()
  setTimeout(() => {
    if (hit.value === i) hit.value = null
  }, 200)
  if (sequence.value[inputIdx.value] !== i) {
    // Faux pas : la manche en cours est perdue, les précédentes sont acquises.
    roundsDone.value = round.value - 1
    if (firstGame.value && roundsDone.value === 0) {
      firstGame.value = false
      phase.value = 'second'
      const my = ++token
      await wait(1800)
      if (my !== token) return
      await start()
      return
    }
    phase.value = 'fail'
    const my = ++token
    await wait(1400)
    if (my !== token) return
    finish(roundsDone.value)
    return
  }
  inputIdx.value += 1
  if (inputIdx.value < sequence.value.length) return
  roundsDone.value = round.value
  if (round.value >= DANCE_MAX_ROUNDS) {
    phase.value = 'perfect'
    fanfare('epic')
    return
  }
  phase.value = 'between'
  const my = ++token
  await wait(500)
  if (my !== token) return
  await nextRound()
}

const inGame = computed(() => ['show', 'input', 'between', 'second', 'fail'].includes(phase.value))

// Fermer en pleine partie = abandonner : ce qui est acquis est soumis.
watch(open, (v) => {
  if (v) {
    reset()
  } else if (!finished) {
    if (inGame.value || phase.value === 'perfect') finish(roundsDone.value)
    else finish(null)
  }
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Répétition de danse"
    :ui="{ content: 'max-w-md' }"
  >
    <template #body>
      <div class="dance">
        <div
          v-if="phase === 'intro'"
          class="dance__intro"
        >
          <p>
            Avant le concours, une petite répétition s'impose ! Montre à ton Pokémon ce qu'il va devoir présenter.
          </p>
          <p>
            Cette chorégraphie peut te rapporter jusqu'à
            <b>{{ DANCE_MAX_ROUNDS * DANCE_POINTS_PER_ROUND }} points</b> pour le concours
            ({{ DANCE_POINTS_PER_ROUND }} points par manche réussie). Une seule tentative.
          </p>
          <p class="dance__fine">
            Tu peux aussi passer et le laisser y aller au talent… mais bon, on sait comment ça peut finir.
          </p>
          <div class="dance__btns">
            <PButton
              icon="i-lucide-music"
              @click="start"
            >
              Jouer
            </PButton>
            <PButton
              color="neutral"
              @click="finish(null)"
            >
              Passer
            </PButton>
          </div>
        </div>

        <template v-else>
          <p class="dance__round tabular">
            Manche {{ round }} / {{ DANCE_MAX_ROUNDS }}
          </p>
          <p
            class="dance__status"
            aria-live="polite"
          >
            {{ status }}
          </p>
          <div
            class="dance__grid"
            :class="{ 'dance__grid--locked': phase !== 'input' }"
          >
            <button
              v-for="(p, i) in PANELS"
              :key="p.key"
              type="button"
              class="panel"
              :class="[`panel--${p.key}`, { 'panel--on': active === i || hit === i }]"
              :disabled="phase !== 'input'"
              :aria-label="p.label"
              @click="onPanel(i)"
            >
              <span class="panel__label">{{ p.label }}</span>
            </button>
          </div>
          <div
            v-if="phase === 'perfect'"
            class="dance__btns"
          >
            <PButton
              icon="i-lucide-check"
              @click="finish(roundsDone)"
            >
              Continuer
            </PButton>
          </div>
        </template>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.dance { display: flex; flex-direction: column; gap: 12px; }
.dance__intro { display: flex; flex-direction: column; gap: 10px; font-size: .92rem; color: var(--ui-text); }
.dance__intro p { margin: 0; }
.dance__fine { font-size: .82rem; color: var(--ui-text-muted); font-style: italic; }
.dance__btns { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 4px; }
.dance__round { text-align: center; font-family: var(--font-display); font-weight: 700; margin: 0; }
.dance__status { text-align: center; color: var(--ui-text-muted); font-size: .9rem; min-height: 1.4em; margin: 0; }
.dance__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.dance__grid--locked { opacity: .9; }
.panel {
  position: relative;
  aspect-ratio: 1;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  color: #fff;
  transition: transform .12s var(--ease-pop), filter .12s ease;
  display: grid;
  place-items: end start;
  padding: 10px;
}
.panel:disabled { cursor: default; }
.panel:focus-visible { outline: 3px solid var(--color-poke-400); outline-offset: 2px; }
.panel__label { font-size: .7rem; font-weight: 700; text-align: left; opacity: .85; line-height: 1.2; }
.panel--red { background: #5c1613; }
.panel--blue { background: #123a5e; }
.panel--green { background: #1f4d24; }
.panel--yellow { background: #6b5e12; color: #2d2600; }
.panel--on { transform: scale(1.06); filter: brightness(1.1); }
.panel--red.panel--on { background: #e53935; }
.panel--blue.panel--on { background: #1e88e5; }
.panel--green.panel--on { background: #43a047; }
.panel--yellow.panel--on { background: #fdd835; }
</style>
