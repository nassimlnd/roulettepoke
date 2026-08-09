<script setup lang="ts">
import type { MotusToday, MotusLeaderboardRow } from '~/types/api'
import { motusRepo } from '~/repositories'

// Motus — le mot du jour. Un mot de 6 à 8 lettres partagé par tous les joueurs,
// 6 essais, première lettre donnée. Victoire : une forme de Zarbi tirée parmi
// les lettres du mot (shiny possible) ; le premier gagnant du jour touche +10 🪙.
//
// La saisie ne passe par AUCUN <input> : une chaîne `typed` alimentée par le
// clavier physique (écouteur window) et le clavier virtuel. C'est ce qui permet
// à `inputmode`/focus de ne jamais ouvrir le clavier natif sur mobile — le jeu
// fournit le sien, comme Tusmo — tout en tapant naturellement sur desktop.
const KEYBOARD_ROWS = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'] as const

const wallet = useWalletStore()
const collection = useCollectionStore()

const today = ref<MotusToday | null>(null)
// Lettres saisies APRÈS la première, qui est donnée et verrouillée.
const typed = ref('')
const submitting = ref(false)
const guessError = ref('')
const firstWinnerCoins = ref(0)

const { loading, errorMsg, retry } = usePageData(async () => {
  today.value = await motusRepo.today(useApi())
  if (today.value.status !== 'in_progress') loadBoard()
})

const playing = computed(() => today.value?.status === 'in_progress')
const lockedFirst = computed(() => today.value?.firstLetter ?? '')
const freeLength = computed(() =>
  today.value ? today.value.wordLength - (lockedFirst.value ? 1 : 0) : 0)
const fullGuess = computed(() => lockedFirst.value + typed.value)
const canSubmit = computed(() =>
  playing.value && typed.value.length === freeLength.value && !submitting.value)

// ─── Grille ───────────────────────────────────────────────────────────────────
type Row
  = | { kind: 'done', cells: { letter: string, state: string }[] }
    | { kind: 'active' }
    | { kind: 'empty' }

const rows = computed<Row[]>(() => {
  const t = today.value
  if (!t) return []
  return Array.from({ length: t.maxAttempts }, (_, i) => {
    const attempt = t.attempts[i]
    if (attempt) return { kind: 'done', cells: attempt.result }
    if (i === t.attempts.length && t.status === 'in_progress') return { kind: 'active' }
    return { kind: 'empty' }
  })
})

const activeCells = computed(() => {
  const t = today.value
  if (!t) return []
  return Array.from({ length: t.wordLength }, (_, i) => ({
    letter: fullGuess.value[i] ?? '',
    locked: i === 0 && !!lockedFirst.value,
    // Prochaine case à remplir — le seul repère de position sans focus réel.
    caret: playing.value && i === fullGuess.value.length
  }))
})

const keyStates = computed(() => bestLetterStates(today.value?.attempts ?? []))

// ─── Saisie ───────────────────────────────────────────────────────────────────
function pressLetter(letter: string) {
  if (!playing.value || submitting.value) return
  if (typed.value.length >= freeLength.value) return
  typed.value += letter
  guessError.value = ''
}
function pressBackspace() {
  if (!playing.value || submitting.value) return
  typed.value = typed.value.slice(0, -1)
  guessError.value = ''
}

async function submitGuess() {
  if (!canSubmit.value || !today.value) return
  submitting.value = true
  guessError.value = ''
  try {
    const res = await motusRepo.guess(useApi(), fullGuess.value)
    const t = today.value
    t.attempts.push({ guess: res.guess, result: res.result })
    t.status = res.status
    t.word = res.word ?? t.word
    t.rewardForm = res.rewardForm ?? t.rewardForm
    typed.value = ''
    if (res.firstWinnerBonusCoins > 0) {
      firstWinnerCoins.value = res.firstWinnerBonusCoins
      // Crédité côté serveur dans la région active — reflété tout de suite.
      wallet.credit(res.firstWinnerBonusCoins, 'motus')
    }
    // La forme de Zarbi gagnée doit apparaître dans la collection au prochain
    // passage, sans attendre l'expiration du cache.
    if (res.status === 'won') collection.invalidate()
    if (res.status !== 'in_progress') loadBoard()
  } catch (err) {
    // Mot hors dictionnaire, etc. — l'essai n'est PAS consommé, la saisie reste
    // en place pour être corrigée.
    guessError.value = humanizeError(err)
  } finally {
    submitting.value = false
  }
}

// Clavier physique. On ignore la frappe destinée à un champ réel (le tchat
// global a un textarea) : sans ce garde, écrire « salut » au tchat jouerait
// S-A-L-U-T dans la grille.
function onKeydown(e: KeyboardEvent) {
  if (!playing.value) return
  const t = e.target as HTMLElement | null
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
  if (e.metaKey || e.ctrlKey || e.altKey) return
  if (e.key === 'Enter') {
    submitGuess()
    return
  }
  if (e.key === 'Backspace') {
    pressBackspace()
    return
  }
  const k = e.key.toUpperCase()
  if (/^[A-Z]$/.test(k)) pressLetter(k)
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

// ─── Classement du jour ───────────────────────────────────────────────────────
// Chargé seulement une fois la partie finie : pendant qu'on joue, il n'apporte
// rien et la page reste concentrée sur la grille.
const board = ref<MotusLeaderboardRow[]>([])
const boardLoaded = ref(false)
const boardPage = ref(0)
const BOARD_PAGE_SIZE = 10

async function loadBoard() {
  if (boardLoaded.value) return
  boardLoaded.value = true
  try {
    board.value = await motusRepo.leaderboard(useApi())
  } catch {
    boardLoaded.value = false // silencieux : réessayé au prochain passage
  }
}
const pageCount = computed(() => Math.ceil(board.value.length / BOARD_PAGE_SIZE))
const pageRows = computed(() =>
  board.value.slice(boardPage.value * BOARD_PAGE_SIZE, (boardPage.value + 1) * BOARD_PAGE_SIZE))

const definitionUrl = computed(() => {
  const w = today.value?.word
  return w ? `https://www.portail-lexical.fr/definition/${encodeURIComponent(w.toLowerCase())}` : null
})

const STATE_LABELS: Record<string, string> = {
  correct: 'bien placée',
  present: 'mal placée',
  absent: 'absente'
}
</script>

<template>
  <div class="motus">
    <header class="motus__head">
      <div>
        <h1 class="motus__title font-display">
          Motus
        </h1>
        <p class="motus__lead">
          Un mot à deviner chaque jour, le même pour tout le monde. À la clé :
          une forme de Zarbi tirée des lettres du mot — et +10 🪙 pour la
          première personne qui le trouve.
        </p>
      </div>
      <CoinBalance />
    </header>

    <PageError
      v-if="errorMsg"
      :message="errorMsg"
      :pending="loading"
      @retry="retry"
    />

    <template v-else-if="loading">
      <USkeleton class="mx-auto h-72 w-full max-w-md rounded-2xl" />
    </template>

    <template v-else-if="today">
      <div class="motus__meta">
        <span
          v-if="lockedFirst"
          class="motus__hint"
        >💡 Le mot commence par <b>{{ lockedFirst }}</b></span>
        <span class="motus__counter tabular">
          Essais : <b>{{ today.attempts.length }}/{{ today.maxAttempts }}</b>
        </span>
      </div>

      <!-- Grille -->
      <div
        class="mg"
        :style="{ '--len': today.wordLength }"
        role="group"
        aria-label="Grille du mot du jour"
      >
        <div
          v-for="(row, i) in rows"
          :key="i"
          class="mg__row"
        >
          <template v-if="row.kind === 'done'">
            <span
              v-for="(cell, j) in row.cells"
              :key="j"
              class="mg__cell"
              :class="`mg__cell--${cell.state}`"
              :title="`${cell.letter} : ${STATE_LABELS[cell.state]}`"
            >{{ cell.letter }}</span>
          </template>
          <template v-else-if="row.kind === 'active'">
            <span
              v-for="(cell, j) in activeCells"
              :key="j"
              class="mg__cell mg__cell--input"
              :class="{ 'mg__cell--lockedfirst': cell.locked, 'mg__cell--caret': cell.caret }"
            >{{ cell.letter }}</span>
          </template>
          <template v-else>
            <span
              v-for="j in today.wordLength"
              :key="j"
              class="mg__cell mg__cell--future"
            />
          </template>
        </div>
      </div>

      <p
        v-if="guessError"
        class="motus__error"
        role="alert"
      >
        {{ guessError }}
      </p>

      <div
        v-if="playing"
        class="motus__actions"
      >
        <PButton
          :disabled="!canSubmit"
          :loading="submitting"
          icon="i-lucide-check"
          @click="submitGuess"
        >
          Valider
        </PButton>
      </div>

      <!-- Fin de partie -->
      <PPanel
        v-else
        class="motus__end"
      >
        <template v-if="today.status === 'won'">
          <p class="motus__verdict motus__verdict--won font-display">
            🎉 Trouvé en {{ today.attempts.length }} essai{{ today.attempts.length > 1 ? 's' : '' }} !
          </p>
          <div
            v-if="today.rewardForm"
            class="motus__reward"
          >
            <img
              :src="today.rewardForm.imageUrl"
              :alt="`Zarbi ${today.rewardForm.form}`"
              class="motus__reward-img"
            >
            <p>
              Tu remportes <b>Zarbi {{ today.rewardForm.form }}</b><template v-if="today.rewardForm.isAlt">
                — version <b>✦ shiny</b> !
              </template>
              <NuxtLink
                to="/collection"
                class="motus__link"
              >Voir ma collection</NuxtLink>
            </p>
          </div>
          <p
            v-if="firstWinnerCoins"
            class="motus__first"
          >
            🥇 Première personne à trouver le mot aujourd'hui : +{{ firstWinnerCoins }} 🪙 !
          </p>
        </template>
        <template v-else>
          <p class="motus__verdict motus__verdict--lost font-display">
            😢 Raté pour aujourd'hui…
          </p>
          <p v-if="today.word">
            Le mot était <b class="motus__word">{{ today.word }}</b>.
            Reviens demain pour un nouveau mot !
          </p>
        </template>
        <a
          v-if="definitionUrl"
          :href="definitionUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="motus__link"
        >
          📖 Voir la définition de « {{ today.word }} »
        </a>
      </PPanel>

      <!-- Clavier virtuel -->
      <div
        class="kb"
        :class="{ 'kb--off': !playing }"
        aria-label="Clavier virtuel"
      >
        <div
          v-for="(kbRow, r) in KEYBOARD_ROWS"
          :key="r"
          class="kb__row"
        >
          <button
            v-if="r === KEYBOARD_ROWS.length - 1"
            type="button"
            class="kb__key kb__key--wide"
            aria-label="Valider le mot"
            :disabled="!canSubmit"
            @click="submitGuess"
          >
            ↵
          </button>
          <button
            v-for="letter in kbRow.split('')"
            :key="letter"
            type="button"
            class="kb__key"
            :class="keyStates[letter] ? `kb__key--${keyStates[letter]}` : ''"
            :disabled="!playing"
            @click="pressLetter(letter)"
          >
            {{ letter }}
          </button>
          <button
            v-if="r === KEYBOARD_ROWS.length - 1"
            type="button"
            class="kb__key kb__key--wide"
            aria-label="Effacer la dernière lettre"
            :disabled="!playing || !typed"
            @click="pressBackspace"
          >
            ⌫
          </button>
        </div>
      </div>

      <!-- Classement du jour (après la partie) -->
      <PPanel
        v-if="!playing && board.length"
        class="board"
      >
        <h2 class="board__title font-display">
          <UIcon
            name="i-lucide-trophy"
            class="size-4"
          /> Classement du jour
        </h2>
        <ol class="board__list">
          <li
            v-for="r in pageRows"
            :key="r.rank"
            class="board__row"
          >
            <span class="board__rank tabular">#{{ r.rank }}</span>
            <span class="board__name">{{ r.username }} <template v-if="r.firstWinner">🥇</template></span>
            <span class="board__tries tabular">{{ r.attemptsUsed }} essai{{ r.attemptsUsed > 1 ? 's' : '' }}</span>
          </li>
        </ol>
        <div
          v-if="pageCount > 1"
          class="board__pager"
        >
          <UButton
            size="xs"
            variant="soft"
            color="neutral"
            icon="i-lucide-chevron-left"
            :disabled="boardPage === 0"
            aria-label="Page précédente"
            @click="boardPage--"
          />
          <span class="tabular">{{ boardPage + 1 }}/{{ pageCount }}</span>
          <UButton
            size="xs"
            variant="soft"
            color="neutral"
            icon="i-lucide-chevron-right"
            :disabled="boardPage >= pageCount - 1"
            aria-label="Page suivante"
            @click="boardPage++"
          />
        </div>
      </PPanel>
      <p
        v-else-if="!playing && boardLoaded"
        class="board__empty"
      >
        Personne n'a encore trouvé le mot aujourd'hui — tu peux être la première personne !
      </p>
    </template>
  </div>
</template>

<style scoped>
.motus {
  max-width: 34rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
/* La bulle de tchat flotte au-dessus du dock, côté droit : sans dégagement,
   elle recouvre la touche ⌫ quand on est en bas de page sur téléphone. */
@media (max-width: 640px) {
  .motus { padding-bottom: 84px; }
}
.motus__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}
.motus__title { font-weight: 700; font-size: 1.7rem; margin: 0; }
.motus__lead {
  font-weight: 600;
  font-size: .9rem;
  color: var(--ui-text-muted);
  margin: 4px 0 0;
  max-width: 26rem;
}
.motus__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.motus__hint { font-size: .9rem; color: var(--ui-text-toned); }
.motus__counter { font-size: .88rem; color: var(--ui-text-muted); }

/* ─── Grille ─── */
.mg {
  display: flex;
  flex-direction: column;
  gap: 7px;
  width: 100%;
  max-width: calc(var(--len) * 58px + (var(--len) - 1) * 7px);
  margin: 0 auto;
}
.mg__row {
  display: grid;
  grid-template-columns: repeat(var(--len), 1fr);
  gap: 7px;
}
.mg__cell {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 11px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(1.05rem, 4.6vw, 1.45rem);
  text-transform: uppercase;
  color: var(--ui-text-highlighted);
  background: var(--ui-bg-elevated);
  border: 1.5px solid var(--ui-border);
  user-select: none;
}
/* Convention Motus : carré rouge = bien placée, rond jaune = mal placée. */
.mg__cell--correct {
  background: linear-gradient(150deg, #ee5a48, var(--color-poke-500));
  border-color: transparent;
  color: #fff;
  box-shadow: 0 2px 0 var(--color-poke-700);
}
.mg__cell--present {
  background: radial-gradient(circle at 35% 30%, #ffe9b0, #f6c453 70%);
  border-color: transparent;
  border-radius: 50%;
  color: #7c5210;
}
.mg__cell--absent {
  background: var(--ui-bg-muted);
  color: var(--ui-text-dimmed);
}
.mg__cell--lockedfirst {
  background: var(--color-poke-50);
  border-color: var(--color-poke-200);
  color: var(--color-poke-600);
}
.mg__cell--caret { border-color: var(--color-poke-400); border-width: 2px; }
.mg__cell--future { background: transparent; border-style: dashed; opacity: .55; }

.motus__error {
  text-align: center;
  font-size: .88rem;
  font-weight: 700;
  color: var(--color-poke-600);
  margin: 0;
}
.motus__actions { display: flex; justify-content: center; }

/* ─── Fin de partie ─── */
.motus__end { text-align: center; }
.motus__verdict { font-size: 1.2rem; font-weight: 700; margin: 0 0 10px; }
.motus__verdict--lost { color: var(--ui-text-muted); }
.motus__word { text-transform: uppercase; letter-spacing: .04em; }
.motus__reward {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 8px 0;
}
.motus__reward-img {
  width: 64px;
  height: 64px;
  object-fit: contain;
  filter: drop-shadow(0 3px 5px rgba(60, 40, 90, .3));
}
.motus__first { font-weight: 700; color: #b07d12; margin: 8px 0 0; }
.motus__link {
  display: inline-block;
  margin-top: 8px;
  font-weight: 700;
  font-size: .88rem;
  color: var(--color-poke-600);
  text-decoration: underline;
}

/* ─── Clavier virtuel ─── */
.kb {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 2px;
}
.kb--off { opacity: .45; }
.kb__row { display: flex; justify-content: center; gap: 5px; }
.kb__key {
  flex: 1;
  max-width: 42px;
  height: 48px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .95rem;
  color: var(--ui-text);
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  cursor: pointer;
  transition: transform .08s var(--ease-pop), background .15s ease;
  touch-action: manipulation;
}
.kb__key:active:not(:disabled) { transform: scale(.93); }
.kb__key:disabled { cursor: default; }
.kb__key--wide { max-width: 64px; flex: 1.4; font-size: 1.1rem; }
.kb__key--correct {
  background: linear-gradient(150deg, #ee5a48, var(--color-poke-500));
  border-color: transparent;
  color: #fff;
}
.kb__key--present {
  background: #f6c453;
  border-color: transparent;
  color: #7c5210;
}
.kb__key--absent {
  background: var(--ui-bg-muted);
  color: var(--ui-text-dimmed);
  border-color: transparent;
}
@media (prefers-reduced-motion: reduce) {
  .kb__key { transition: none; }
}

/* ─── Classement ─── */
.board__title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0 0 10px;
}
.board__list { display: flex; flex-direction: column; gap: 4px; margin: 0; padding: 0; list-style: none; }
.board__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 10px;
  background: var(--ui-bg-muted);
  font-size: .9rem;
}
.board__rank { color: var(--ui-text-dimmed); font-weight: 700; min-width: 2.2rem; }
.board__name { flex: 1; min-width: 0; font-weight: 700; color: var(--ui-text-highlighted); }
.board__tries { color: var(--ui-text-muted); }
.board__pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 10px;
  font-size: .85rem;
  color: var(--ui-text-muted);
}
.board__empty { text-align: center; color: var(--ui-text-dimmed); font-size: .9rem; }
</style>
