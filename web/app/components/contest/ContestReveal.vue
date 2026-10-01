<script setup lang="ts">
// Dévoilement des résultats du Concours : mise en scène du classement déjà
// calculé par le serveur. Du dernier au premier, chaque Pokémon reçoit trois
// pancartes de juges (répartition entière du score), puis son total et son
// verdict. « Passer » file jusqu'au bout sans couper ; le gagnant est le
// seul à avoir perdu sa carte — « il part en tournée internationale ».
import type { DomainContest, ContestResult } from '~/types/domain'
import { displayScores, splitJudgeScores, JUDGE_FALLBACK, JUDGE_WEIGHTS } from '~/utils/contest'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ contest: DomainContest, me: string | null }>()

const { tick, fanfare } = useSound()
const reduced = usePreferredReducedMotion()

interface Row {
  result: ContestResult
  placards: (number | null)[]
  total: number | null
  verdict: string
  state: 'pending' | 'live' | 'done'
}
const rows = ref<Row[]>([])
const judges = computed(() => JUDGE_FALLBACK.map((fallback, i) => ({
  name: props.contest.judges[i] ?? fallback,
  weight: Math.round(JUDGE_WEIGHTS[i]! * 100)
})))

let fast = false
let token = 0
const wait = (ms: number) => new Promise(r => setTimeout(r, fast ? 0 : reduced.value === 'reduce' ? Math.min(ms, 100) : ms))

function build() {
  rows.value = [...props.contest.results]
    .sort((a, b) => b.placement - a.placement)
    .map(result => ({ result, placards: [null, null, null], total: null, verdict: '', state: 'pending' }))
}

async function run() {
  const my = ++token
  fast = false
  build()
  const scores = displayScores(props.contest.results)
  for (const row of rows.value) {
    if (my !== token) return
    row.state = 'live'
    const total = scores.get(row.result.placement) ?? Math.round(row.result.score)
    const parts = splitJudgeScores(total)
    for (let i = 0; i < parts.length; i++) {
      await wait(500)
      if (my !== token) return
      row.placards[i] = parts[i]!
      tick()
    }
    await wait(500)
    if (my !== token) return
    row.total = total
    if (row.result.placement === 1) {
      row.verdict = 'Pokémon gagnant ! Il part en tournée internationale.'
      fanfare('legendary')
    } else {
      row.verdict = `${row.result.placement}ᵉ sur ${rows.value.length}`
    }
    row.state = 'done'
    await wait(row.result.placement === 1 ? 1600 : 1200)
  }
}

function skip() {
  fast = true
}

watch(open, (v) => {
  if (v) run()
  else token++
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Dévoilement — ${contest.discipline}`"
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <div class="rv">
        <ul class="rv__judges">
          <li
            v-for="j in judges"
            :key="j.name"
            class="judge"
          >
            <UIcon
              name="i-lucide-gavel"
              class="size-4"
            />
            <span class="judge__name">{{ j.name }}</span>
            <span class="judge__w tabular">{{ j.weight }} %</span>
          </li>
        </ul>

        <ol class="rv__list">
          <li
            v-for="row in rows"
            :key="row.result.userId"
            class="entry"
            :class="[`entry--${row.state}`, {
              'entry--winner': row.state === 'done' && row.result.placement === 1,
              'entry--mine': row.result.userId === me
            }]"
          >
            <span class="entry__rank tabular">{{ row.result.placement === 1 ? '🏆' : `#${row.result.placement}` }}</span>
            <img
              v-if="row.result.imageUrl"
              :src="row.result.imageUrl"
              :alt="row.result.cardName"
              class="entry__img"
            >
            <span class="entry__who">
              <b>{{ row.result.cardName }}</b>
              <span class="entry__user">{{ row.result.username }}</span>
            </span>
            <span class="entry__placards">
              <span
                v-for="(p, i) in row.placards"
                :key="i"
                class="placard tabular"
                :class="{ 'placard--up': p !== null }"
              >{{ p === null ? '?' : p }}</span>
            </span>
            <span class="entry__total tabular">{{ row.total === null ? '—' : row.total }}</span>
            <span
              v-if="row.verdict"
              class="entry__verdict"
            >{{ row.verdict }}</span>
          </li>
        </ol>

        <div class="rv__btns">
          <PButton
            color="neutral"
            icon="i-lucide-fast-forward"
            @click="skip"
          >
            Passer
          </PButton>
          <PButton
            color="neutral"
            @click="open = false"
          >
            Fermer
          </PButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.rv { display: flex; flex-direction: column; gap: 12px; }
.rv__judges { list-style: none; margin: 0; padding: 0; display: flex; gap: 8px; flex-wrap: wrap; }
.judge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: .8rem;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--ui-bg-muted);
  color: var(--ui-text-muted);
}
.judge__name { font-weight: 700; color: var(--ui-text); }
.rv__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; max-height: 60vh; overflow-y: auto; }
.entry {
  display: grid;
  grid-template-columns: auto auto 1fr auto auto;
  grid-template-areas: 'rank img who placards total' 'rank img verdict verdict verdict';
  align-items: center;
  gap: 4px 10px;
  padding: 8px 10px;
  border-radius: 12px;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  transition: opacity .3s ease, background .3s ease;
}
.entry--pending { opacity: .45; }
.entry--mine { border-color: var(--color-poke-400); }
.entry--winner { background: color-mix(in oklab, #f6c453 22%, var(--ui-bg-elevated)); border-color: #e0a92e; }
.entry__rank { grid-area: rank; font-family: var(--font-display); font-weight: 700; min-width: 2.2em; }
.entry__img { grid-area: img; width: 40px; height: 40px; object-fit: contain; }
.entry__who { grid-area: who; display: flex; flex-direction: column; min-width: 0; font-size: .86rem; }
.entry__user { font-size: .76rem; color: var(--ui-text-muted); }
.entry__placards { grid-area: placards; display: flex; gap: 4px; }
.placard {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 36px;
  border-radius: 7px;
  background: var(--ui-bg-accented);
  color: var(--ui-text-dimmed);
  font-weight: 700;
  font-size: .82rem;
  transition: transform .25s var(--ease-pop), background .25s ease;
}
.placard--up { background: #fff2d6; color: #8a5a12; transform: translateY(-2px); }
:global(.dark) .placard--up { background: #4a3a14; color: #f1d9a0; }
.entry__total { grid-area: total; font-family: var(--font-display); font-weight: 700; font-size: 1.05rem; min-width: 2.5em; text-align: right; }
.entry__verdict { grid-area: verdict; font-size: .78rem; color: var(--ui-text-muted); }
.entry--winner .entry__verdict { color: #8a5a12; font-weight: 700; }
.rv__btns { display: flex; gap: 10px; justify-content: flex-end; }
@media (max-width: 480px) {
  .entry { grid-template-columns: auto 1fr auto; grid-template-areas: 'rank who total' 'img placards placards' 'verdict verdict verdict'; }
}
</style>
