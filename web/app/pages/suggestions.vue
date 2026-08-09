<script setup lang="ts">
import type { DomainSuggestion, DomainPoll } from '~/types/domain'
import type { SuggestionStatus, VoteValue, UUID } from '~/types/api'
import { suggestionsRepo, pollsRepo } from '~/repositories'

// Idées & sondages — la voix des joueurs. Trois blocs : les sondages ouverts
// par l'équipe, le dépôt d'idée, et le tableau d'avancement (roadmap).
//
// Le tableau de l'original est un kanban de 4 colonnes côte à côte — illisible
// sur téléphone. Ici les statuts s'empilent en sections, même information,
// lisible partout.
const toast = useToast()

const SUGGESTION_MAX_LEN = 500

// Sections joueur, dans l'ordre de l'original. `rejected` et `archived` ne
// sont pas montrés aux joueurs — même règle que le front d'origine.
const SECTIONS: { status: SuggestionStatus, label: string, icon: string, hint?: string }[] = [
  { status: 'proposed', label: 'Propositions', icon: 'i-lucide-lightbulb', hint: 'Les idées des joueurs — vote pour celles qui te parlent.' },
  { status: 'planned', label: 'À faire', icon: 'i-lucide-clipboard-list' },
  { status: 'in_progress', label: 'En cours', icon: 'i-lucide-wrench' },
  { status: 'done', label: 'Fait', icon: 'i-lucide-check-check' }
]

const suggestions = ref<DomainSuggestion[]>([])
const polls = ref<DomainPoll[]>([])

const { loading, errorMsg, retry } = usePageData(async () => {
  const [sugg, pollList] = await Promise.all([
    suggestionsRepo.list(useApi()),
    pollsRepo.list(useApi()).catch(() => [] as DomainPoll[])
  ])
  suggestions.value = sugg.suggestions
  polls.value = pollList
})

const bySection = computed(() =>
  SECTIONS.map(s => ({
    ...s,
    items: suggestions.value.filter(x => x.status === s.status)
  })).filter(s => s.items.length > 0 || s.status === 'proposed'))

// ─── Déposer une idée ─────────────────────────────────────────────────────────
const draft = ref('')
const { pending: sending, run: runSend } = useAsyncAction()

function submitIdea() {
  const text = draft.value.trim()
  if (!text) return
  return runSend(async () => {
    await suggestionsRepo.create(useApi(), text)
    draft.value = ''
    toast.add({ title: 'Idée proposée !', description: 'Elle apparaît dans les propositions, prête à recueillir des votes.', color: 'success', icon: 'i-lucide-lightbulb' })
    const res = await suggestionsRepo.list(useApi())
    suggestions.value = res.suggestions
  })
}

// ─── Votes sur les suggestions ────────────────────────────────────────────────
// Revoter la même valeur RETIRE le vote (vérifié contre l'API) : le bouton
// actif se re-clique pour annuler, et son infobulle le dit.
const votingId = ref<UUID | null>(null)

async function voteSuggestion(s: DomainSuggestion, target: 'suggestion' | 'note', value: VoteValue) {
  if (votingId.value) return
  votingId.value = s.id
  try {
    await suggestionsRepo.vote(useApi(), s.id, target, value)
    const res = await suggestionsRepo.list(useApi())
    suggestions.value = res.suggestions
  } catch (err) {
    toast.add({ title: humanizeError(err), color: 'error' })
  } finally {
    votingId.value = null
  }
}

// ─── Votes sur les sondages ───────────────────────────────────────────────────
// Changer d'option est permis tant que le sondage est ouvert. Re-cliquer sa
// PROPRE option est désactivé : la sémantique serveur de ce geste n'est pas
// vérifiable sans polluer un vrai sondage communautaire.
const pollVoting = ref<UUID | null>(null)

async function votePoll(poll: DomainPoll, optionId: UUID) {
  if (pollVoting.value || !poll.open || poll.myOptionId === optionId) return
  pollVoting.value = poll.id
  try {
    await pollsRepo.vote(useApi(), poll.id, optionId)
    polls.value = await pollsRepo.list(useApi())
  } catch (err) {
    toast.add({ title: humanizeError(err), color: 'error' })
  } finally {
    pollVoting.value = null
  }
}

function pct(votes: number, total: number): number {
  return total > 0 ? Math.round((votes / total) * 100) : 0
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}
</script>

<template>
  <div class="ideas">
    <header class="ideas__head">
      <div>
        <h1 class="ideas__title font-display">
          Idées &amp; sondages
        </h1>
        <p class="ideas__lead">
          Propose une idée pour le jeu, vote pour celles des autres, et suis
          leur avancement. L'équipe répond parfois — et te demande ton avis.
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
      <USkeleton class="h-40 w-full rounded-2xl" />
      <USkeleton class="h-64 w-full rounded-2xl" />
    </template>

    <template v-else>
      <!-- ─── Sondages ─── -->
      <PPanel
        v-for="poll in polls"
        :key="poll.id"
        class="poll"
      >
        <div class="poll__head">
          <span
            class="poll__badge"
            :class="poll.open ? 'poll__badge--open' : 'poll__badge--closed'"
          >{{ poll.open ? 'Sondage ouvert' : 'Sondage clos' }}</span>
          <span class="poll__meta tabular">
            {{ poll.totalVotes }} vote{{ poll.totalVotes > 1 ? 's' : '' }} · {{ fmtDate(poll.createdAt) }}
          </span>
        </div>
        <h2 class="poll__q font-display">
          {{ poll.question }}
        </h2>
        <div class="poll__options">
          <button
            v-for="o in poll.options"
            :key="o.id"
            type="button"
            class="popt"
            :class="{ 'popt--mine': o.id === poll.myOptionId }"
            :disabled="!poll.open || o.id === poll.myOptionId || pollVoting === poll.id"
            :title="o.id === poll.myOptionId ? 'Ton vote' : (poll.open ? 'Voter pour cette option' : undefined)"
            @click="votePoll(poll, o.id)"
          >
            <i
              class="popt__bar"
              :style="{ width: pct(o.votes, poll.totalVotes) + '%' }"
            />
            <span class="popt__label">
              <UIcon
                v-if="o.id === poll.myOptionId"
                name="i-lucide-check"
                class="size-4"
              />
              {{ o.label }}
            </span>
            <span class="popt__count tabular">{{ o.votes }} · {{ pct(o.votes, poll.totalVotes) }} %</span>
          </button>
        </div>
      </PPanel>

      <!-- ─── Proposer une idée ─── -->
      <PPanel class="propose">
        <h2 class="sect font-display">
          <UIcon
            name="i-lucide-lightbulb"
            class="size-4"
          /> Proposer une idée
        </h2>
        <form
          class="propose__form"
          @submit.prevent="submitIdea"
        >
          <textarea
            v-model="draft"
            class="propose__input"
            :maxlength="SUGGESTION_MAX_LEN"
            rows="3"
            placeholder="Ton idée pour PokéRoulette…"
            :disabled="sending"
          />
          <div class="propose__row">
            <span class="propose__count tabular">{{ draft.length }}/{{ SUGGESTION_MAX_LEN }}</span>
            <PButton
              type="submit"
              icon="i-lucide-send"
              :loading="sending"
              :disabled="!draft.trim() || sending"
            >
              Proposer
            </PButton>
          </div>
        </form>
      </PPanel>

      <!-- ─── Le tableau ─── -->
      <section
        v-for="sec in bySection"
        :key="sec.status"
        class="col"
      >
        <h2 class="sect font-display">
          <UIcon
            :name="sec.icon"
            class="size-4"
          />
          {{ sec.label }}
          <span class="sect__count tabular">{{ sec.items.length }}</span>
        </h2>
        <p
          v-if="sec.hint"
          class="sect__hint"
        >
          {{ sec.hint }}
        </p>

        <p
          v-if="!sec.items.length"
          class="col__empty"
        >
          Aucune idée ici pour l'instant — la tienne peut être la première !
        </p>

        <article
          v-for="s in sec.items"
          :key="s.id"
          class="card"
          :class="{ 'card--official': s.official }"
        >
          <span
            v-if="s.official"
            class="card__flag"
          >🚀 Roadmap officielle</span>
          <h3
            v-if="s.title"
            class="card__title font-display"
          >
            {{ s.title }}
          </h3>
          <p class="card__text">
            {{ s.text }}
          </p>
          <p class="card__meta">
            {{ s.username }}<template v-if="s.authorIsAdmin">
              · équipe
            </template> · {{ fmtDate(s.createdAt) }}
          </p>

          <div class="votes">
            <button
              type="button"
              class="vbtn"
              :class="{ 'vbtn--up': s.myVote === 1 }"
              :disabled="votingId === s.id"
              :title="s.myVote === 1 ? 'Retirer mon vote' : 'Pour'"
              @click="voteSuggestion(s, 'suggestion', 1)"
            >
              👍 <span class="tabular">{{ s.upVotes }}</span>
            </button>
            <button
              type="button"
              class="vbtn"
              :class="{ 'vbtn--down': s.myVote === -1 }"
              :disabled="votingId === s.id"
              :title="s.myVote === -1 ? 'Retirer mon vote' : 'Contre'"
              @click="voteSuggestion(s, 'suggestion', -1)"
            >
              👎 <span class="tabular">{{ s.downVotes }}</span>
            </button>
          </div>

          <div
            v-if="s.adminNote"
            class="note"
          >
            <p class="note__text">
              <UIcon
                name="i-lucide-message-circle"
                class="size-4"
              />
              {{ s.adminNote }}
            </p>
            <div
              v-if="s.noteVotingEnabled"
              class="votes votes--note"
            >
              <span class="note__ask">Cette réponse te convient ?</span>
              <button
                type="button"
                class="vbtn vbtn--sm"
                :class="{ 'vbtn--up': s.myNoteVote === 1 }"
                :disabled="votingId === s.id"
                @click="voteSuggestion(s, 'note', 1)"
              >
                👍 <span class="tabular">{{ s.noteUpVotes }}</span>
              </button>
              <button
                type="button"
                class="vbtn vbtn--sm"
                :class="{ 'vbtn--down': s.myNoteVote === -1 }"
                :disabled="votingId === s.id"
                @click="voteSuggestion(s, 'note', -1)"
              >
                👎 <span class="tabular">{{ s.noteDownVotes }}</span>
              </button>
            </div>
          </div>
        </article>
      </section>
    </template>
  </div>
</template>

<style scoped>
.ideas {
  max-width: 44rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.ideas__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}
.ideas__title { font-weight: 700; font-size: 1.7rem; margin: 0; }
.ideas__lead {
  font-weight: 600;
  font-size: .9rem;
  color: var(--ui-text-muted);
  margin: 4px 0 0;
  max-width: 30rem;
}

.sect {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0 0 4px;
  color: var(--ui-text-highlighted);
}
.sect__count {
  font-size: .78rem;
  font-weight: 700;
  color: var(--ui-text-muted);
  background: var(--ui-bg-muted);
  border-radius: 999px;
  padding: 2px 9px;
}
.sect__hint { font-size: .84rem; color: var(--ui-text-dimmed); margin: 0 0 8px; }

/* ─── Sondage ─── */
.poll__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.poll__badge {
  font-size: .72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .04em;
  padding: 3px 10px;
  border-radius: 999px;
}
.poll__badge--open { color: #2c7a4b; background: color-mix(in oklab, #5bbf82 20%, transparent); }
.poll__badge--closed { color: var(--ui-text-muted); background: var(--ui-bg-muted); }
.poll__meta { font-size: .8rem; color: var(--ui-text-dimmed); }
.poll__q { font-size: 1.15rem; font-weight: 700; margin: 0 0 12px; }
.poll__options { display: flex; flex-direction: column; gap: 7px; }
.popt {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 13px;
  border-radius: 12px;
  border: 1.5px solid var(--ui-border);
  background: var(--ui-bg-elevated);
  overflow: hidden;
  cursor: pointer;
  text-align: left;
  transition: border-color .15s ease, transform .1s var(--ease-pop);
}
.popt:hover:not(:disabled) { border-color: var(--color-poke-300); transform: translateY(-1px); }
.popt:disabled { cursor: default; }
.popt--mine { border-color: var(--color-poke-400); background: var(--color-poke-50); }
.popt__bar {
  position: absolute;
  inset: 0 auto 0 0;
  background: color-mix(in oklab, var(--color-poke-400) 14%, transparent);
  pointer-events: none;
  transition: width .3s ease;
}
.popt__label {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: .92rem;
  color: var(--ui-text);
}
.popt--mine .popt__label { color: var(--color-poke-600); }
.popt__count { position: relative; font-size: .82rem; font-weight: 700; color: var(--ui-text-muted); flex: none; }

/* ─── Formulaire ─── */
.propose__form { display: flex; flex-direction: column; gap: 8px; }
.propose__input {
  resize: vertical;
  min-height: 74px;
  font-family: var(--font-body);
  font-size: .92rem;
  line-height: 1.45;
  color: var(--ui-text-highlighted);
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: 12px;
  padding: 10px 12px;
}
.propose__input:focus { outline: none; border-color: var(--color-poke-400); box-shadow: 0 0 0 3px var(--color-poke-100); }
.propose__row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.propose__count { font-size: .78rem; color: var(--ui-text-dimmed); }

/* ─── Cartes ─── */
.col { display: flex; flex-direction: column; gap: 10px; }
.col__empty { color: var(--ui-text-dimmed); font-size: .88rem; margin: 0; }
.card {
  position: relative;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: 16px;
  padding: 14px 16px;
}
.card--official { border-color: color-mix(in oklab, #9b6fd4 45%, var(--ui-border)); }
.card__flag {
  display: inline-block;
  font-size: .7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: #6f42a8;
  background: color-mix(in oklab, #9b6fd4 16%, transparent);
  border-radius: 999px;
  padding: 3px 10px;
  margin-bottom: 7px;
}
.card__title { font-size: 1.02rem; font-weight: 700; margin: 0 0 5px; }
.card__text { font-size: .92rem; line-height: 1.5; color: var(--ui-text-toned); margin: 0 0 7px; white-space: pre-line; }
.card__meta { font-size: .78rem; color: var(--ui-text-dimmed); margin: 0 0 9px; }

.votes { display: flex; align-items: center; gap: 8px; }
.vbtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: .88rem;
  font-weight: 700;
  color: var(--ui-text-muted);
  background: var(--ui-bg-muted);
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: border-color .15s ease, transform .1s var(--ease-pop);
}
.vbtn:hover:not(:disabled) { transform: translateY(-1px); border-color: var(--ui-border-accented); }
.vbtn:disabled { opacity: .55; cursor: progress; }
.vbtn--up { color: #2c7a4b; background: color-mix(in oklab, #5bbf82 18%, transparent); border-color: #5bbf82; }
.vbtn--down { color: var(--color-poke-600); background: var(--color-poke-50); border-color: var(--color-poke-400); }
.vbtn--sm { padding: 4px 10px; font-size: .8rem; }

.note {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--ui-bg-muted);
}
.note__text {
  display: flex;
  gap: 7px;
  font-size: .88rem;
  line-height: 1.45;
  color: var(--ui-text-toned);
  margin: 0;
  white-space: pre-line;
}
.note__text :deep(svg) { flex: none; margin-top: .15rem; color: var(--ui-text-muted); }
.note__ask { font-size: .8rem; font-weight: 600; color: var(--ui-text-muted); }
.votes--note { margin-top: 8px; flex-wrap: wrap; }
</style>
