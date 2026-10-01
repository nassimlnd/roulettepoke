<script setup lang="ts">
import { GENERATIONS, currencyOf, asGeneration, generationRegion, type Generation } from '~/constants/generation'
import type { ChampionMon, TeamMember, TournamentStatus, TournamentMatch } from '~/types/domain'
import type { PokeType, UUID } from '~/types/api'
import { useTournamentStore, TOURNAMENT_ENTRY_FEE } from '~/stores/tournament'
import { typeSlug } from '~/utils/poke'
import { flipRounds, maxRound, roundLabel } from '~/utils/tournament'

// Page Tournoi hebdomadaire. Inscriptions lundi→mardi 12:00 (20 🪙), équipes
// figées jeudi 11:55, combats jeudi 12:00, gains 60/30/10 %.
const tourney = useTournamentStore()
const wallet = useWalletStore()
const auth = useAuthStore()
const battle = useBattleStore()
const toast = useToast()

const t = computed(() => tourney.current)
const a = computed(() => tourney.analysis)
const me = computed(() => auth.userId)

const STATUS: Record<TournamentStatus, { label: string, cls: string }> = {
  registration_open: { label: 'Inscriptions ouvertes', cls: 'open' },
  registration_closed: { label: 'Inscriptions closes', cls: 'closed' },
  in_progress: { label: 'Combats en cours', cls: 'live' },
  completed: { label: 'Terminé', cls: 'done' },
  cancelled: { label: 'Annulé', cls: 'done' }
}
const statusMeta = computed(() => (t.value ? STATUS[t.value.status] : null))
const dateLabel = computed(() =>
  t.value ? new Date(t.value.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '')

// Estimation 60/30/10 % arrondie aux 5 🪙 tant que le tournoi n'est pas joué ;
// ensuite les gains réellement versés (l'arrondi du serveur diffère un peu).
const prizes = computed(() => {
  const pool = t.value?.prizePool ?? 0
  const r = (p: number) => Math.round((pool * p) / 5) * 5
  const paid = (place: number) => t.value?.results.find(x => x.placement === place)?.prize ?? null
  return [
    { place: 1, medal: '🥇', amount: paid(1) ?? r(0.6) },
    { place: 2, medal: '🥈', amount: paid(2) ?? r(0.3) },
    { place: 3, medal: '🥉', amount: paid(3) ?? r(0.1) }
  ]
})
const matchups = computed(() => [...(a.value?.matchups ?? [])].sort((x, y) => y.winProbability - x.winProbability))
const results = computed(() => [...(t.value?.results ?? [])].sort((x, y) => x.placement - y.placement))

function toMember(c: ChampionMon): TeamMember {
  return { teamEntryId: String(c.position), position: c.position, cardId: '', name: c.name, type: c.type, rarity: c.rarity, isShiny: c.isShiny, imageUrl: c.imageUrl, typeImageUrl: null, biome: null }
}
function typeColor(type: PokeType): string {
  // Repli neutre pour un type hors de notre palette (ex. Acier).
  return `var(--color-type-${typeSlug(type)}, var(--color-ash-400))`
}
function medalFor(place: number): string {
  return place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : `#${place}`
}

// ─── Inscription ──────────────────────────────────────────────────────────────
const registerOpen = ref(false)
const { pending: registering, run } = useAsyncAction()

// ─── Devise d'inscription ─────────────────────────────────────────────────────
// La bourse choisie est débitée (20 🪙) ET recevra le gain. Par défaut la
// région active ; le joueur peut en changer avant de confirmer. Sans ce choix
// le serveur prenait Kanto, même pour un joueur qui joue ailleurs.
const payWith = ref<Generation>(wallet.activeGeneration)
const payOptions = GENERATIONS.map(g => ({ value: String(g.id), label: g.region }))
const payKey = computed({
  get: () => String(payWith.value),
  set: (v: string) => { payWith.value = asGeneration(Number(v)) }
})
const payRegion = computed(() => generationRegion(payWith.value))
const payBalance = computed(() => wallet.purses[payWith.value] ?? 0)
const canAfford = computed(() => payBalance.value >= TOURNAMENT_ENTRY_FEE)

function confirmRegister() {
  if (!canAfford.value) {
    toast.add({ title: `Il te manque des pièces ${payRegion.value} (inscription : ${TOURNAMENT_ENTRY_FEE} 🪙).`, color: 'error' })
    return
  }
  return run(async () => {
    await tourney.register(currencyOf(payWith.value))
    toast.add({ title: 'Inscription confirmée ! 🎉', color: 'success', icon: 'i-lucide-check' })
    registerOpen.value = false
  })
}

// ─── Tableau, parcours et replays (v5) ────────────────────────────────────────
// Le journal serveur d'un match est écrit du point de vue du joueur 1. On le
// rejoue de MON point de vue si je joue (défaite possible — c'est mon match),
// sinon de celui du vainqueur : un replay se termine sur une victoire.
function replay(m: TournamentMatch) {
  const mine = !!me.value && (m.player1Id === me.value || m.player2Id === me.value)
  const povIsP1 = mine ? m.player1Id === me.value : m.winnerId === m.player1Id
  const rounds = povIsP1 ? m.rounds : flipRounds(m.rounds)
  const pov = povIsP1 ? m.player1Name : m.player2Name
  const opp = povIsP1 ? m.player2Name : m.player1Name
  const won = m.winnerId !== null && m.winnerId === (povIsP1 ? m.player1Id : m.player2Id)
  const wins = rounds.filter(r => r.playerWon).length
  const tally = `${wins}/${rounds.length} duel${wins > 1 ? 's' : ''} remporté${wins > 1 ? 's' : ''} face à ${opp}.`
  return battle.present({
    rounds,
    won,
    title: `${pov} vs ${opp}`,
    winTitle: mine ? 'Victoire !' : `${pov} l'emporte !`,
    winSub: tally,
    loseSub: tally
  })
}

const myMatches = computed(() => {
  const id = me.value
  if (!id || !t.value) return []
  return t.value.matches
    .filter(m => m.player1Id === id || m.player2Id === id)
    .sort((x, y) => (x.round || Infinity) - (y.round || Infinity))
})
const currentMaxRound = computed(() => maxRound(t.value?.matches ?? []))
const opponentOf = (m: TournamentMatch) => (m.player1Id === me.value ? m.player2Name : m.player1Name)
const iWon = (m: TournamentMatch) => m.winnerId !== null && m.winnerId === me.value

// ─── Historique (v5) ──────────────────────────────────────────────────────────
const historyOpen = ref(false)
const historyLoading = ref(false)
const viewLoading = ref<UUID | null>(null)
const detailOpen = ref(false)
const history = computed(() => [...tourney.history].sort((x, y) => y.date.localeCompare(x.date)))
const past = computed(() => tourney.viewing)
const pastResults = computed(() => [...(past.value?.results ?? [])].sort((x, y) => x.placement - y.placement))
const pastDate = computed(() =>
  past.value ? new Date(past.value.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '')

async function openHistory() {
  historyOpen.value = true
  historyLoading.value = true
  try {
    await tourney.loadHistory()
  } catch (err) {
    toast.add({ title: humanizeError(err), color: 'error' })
  } finally {
    historyLoading.value = false
  }
}
async function viewPast(id: UUID) {
  viewLoading.value = id
  try {
    await tourney.view(id)
    historyOpen.value = false
    detailOpen.value = true
  } catch (err) {
    toast.add({ title: humanizeError(err), color: 'error' })
  } finally {
    viewLoading.value = null
  }
}
async function replayPast(m: TournamentMatch) {
  // La scène de combat est plein écran : on range la modale le temps du replay.
  detailOpen.value = false
  await replay(m)
  detailOpen.value = true
}
function dateShort(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
onUnmounted(() => {
  tourney.viewing = null
})

const { loading, errorMsg, retry } = usePageData(() => tourney.ensureFresh())
</script>

<template>
  <div class="tn">
    <header class="tn__head">
      <div class="tn__title-wrap">
        <h1 class="tn__title font-display">
          Tournoi
        </h1>
        <span
          v-if="statusMeta"
          class="tn__status"
          :class="`tn__status--${statusMeta.cls}`"
        >{{ statusMeta.label }}</span>
      </div>
      <div class="tn__head-actions">
        <PButton
          color="neutral"
          icon="i-lucide-history"
          @click="openHistory"
        >
          Tournois passés
        </PButton>
        <CoinBalance />
      </div>
    </header>

    <div
      v-if="loading"
      class="tn__load"
    >
      <USkeleton class="h-28 w-full rounded-2xl" />
      <USkeleton class="h-64 w-full rounded-2xl" />
    </div>

    <PageError
      v-else-if="errorMsg"
      :message="errorMsg"
      :pending="loading"
      @retry="retry"
    />

    <!-- Aucun tournoi -->
    <PPanel
      v-else-if="!t"
      class="tn__empty"
    >
      <UIcon
        name="i-lucide-trophy"
        class="size-8"
      />
      <p class="font-display">
        Aucun tournoi cette semaine
      </p>
      <p class="tn__empty-sub">
        Le prochain cycle ouvre lundi. Inscriptions jusqu'au mardi 12:00.
      </p>
    </PPanel>

    <template v-else>
      <!-- Bandeau récapitulatif -->
      <PPanel class="recap">
        <div class="recap__cell">
          <span class="recap__k">Finale</span>
          <span class="recap__v">{{ dateLabel }} · 12:00</span>
        </div>
        <div class="recap__cell">
          <span class="recap__k">Participants</span>
          <span class="recap__v tabular">{{ t.participants.length }}</span>
        </div>
        <div
          v-if="t.weeklyAdvantage"
          class="recap__cell"
        >
          <span class="recap__k">Avantagés (+10 % chacun)</span>
          <span class="recap__v recap__v--adv">
            <span
              class="tchip"
              :style="{ '--tc': typeColor(t.weeklyAdvantage.type) }"
            >{{ t.weeklyAdvantage.type }}</span>
            <span class="tchip tchip--biome">{{ t.weeklyAdvantage.biome }}</span>
          </span>
        </div>
        <div class="recap__cell recap__cell--pool">
          <span class="recap__k">Cagnotte</span>
          <span class="recap__v tabular"><CoinChip size="sm" />{{ t.prizePool }}</span>
          <span class="recap__prizes">
            <span
              v-for="p in prizes"
              :key="p.place"
            >{{ p.medal }} {{ p.amount }}</span>
          </span>
        </div>
      </PPanel>

      <p class="cycle">
        <UIcon
          name="i-lucide-calendar-clock"
          class="size-4"
        />
        Inscriptions lundi → mardi 12:00 · Équipes figées jeudi 11:55 · Combats jeudi 12:00
      </p>

      <!-- Action d'inscription / statut -->
      <div class="tn__cta">
        <div
          v-if="t.status === 'registration_open' && !t.isRegistered"
          class="tn__pay"
        >
          <span class="tn__pay-label">Payer avec</span>
          <PSegmented
            v-model="payKey"
            :options="payOptions"
            size="sm"
            a11y="radio"
            aria-label="Bourse d'inscription"
          />
          <span class="tn__pay-label tabular">{{ payBalance.toLocaleString('fr-FR') }} 🪙 dispo</span>
        </div>
        <PButton
          v-if="t.status === 'registration_open' && !t.isRegistered"
          :disabled="!canAfford"
          @click="registerOpen = true"
        >
          <UIcon
            name="i-lucide-swords"
            class="size-5"
          />
          S'inscrire — {{ TOURNAMENT_ENTRY_FEE }} 🪙
        </PButton>
        <span
          v-else-if="t.isRegistered"
          class="tn__reg"
        >
          <UIcon
            name="i-lucide-check"
            class="size-4"
          /> Inscrit·e — bonne chance jeudi !
        </span>
        <span
          v-else-if="t.status === 'registration_closed'"
          class="tn__closed"
        >
          <UIcon
            name="i-lucide-lock"
            class="size-4"
          /> Inscriptions closes pour ce tournoi
        </span>
      </div>

      <!-- Résultats (terminé) -->
      <section
        v-if="results.length"
        class="block"
      >
        <h2 class="block__title font-display">
          Résultats
        </h2>
        <div class="results">
          <div
            v-for="r in results"
            :key="r.placement"
            class="res"
            :class="{ 'res--podium': r.placement <= 3 }"
          >
            <span class="res__place">{{ medalFor(r.placement) }}</span>
            <TourneyAvatar
              :src="r.avatarUrl"
              :shiny="r.avatarIsShiny"
              :size="40"
              :alt="r.username"
            />
            <span class="res__name">{{ r.username }}</span>
            <span
              v-if="r.prize"
              class="res__prize tabular"
            ><CoinChip size="sm" />{{ r.prize }}</span>
          </div>
        </div>
      </section>

      <!-- Mon parcours (v5) -->
      <section
        v-if="myMatches.length"
        class="block"
      >
        <h2 class="block__title font-display">
          Mon parcours
        </h2>
        <ul class="path">
          <li
            v-for="(m, i) in myMatches"
            :key="i"
            class="path__m"
            :class="{ 'path__m--win': iWon(m), 'path__m--lost': !m.isBye && !iWon(m) }"
          >
            <span class="path__label">{{ roundLabel(m.round, currentMaxRound) }}</span>
            <span
              v-if="m.isBye"
              class="path__res"
            >Passage automatique</span>
            <template v-else>
              <span class="path__opp">contre <b>{{ opponentOf(m) }}</b></span>
              <span class="path__res">{{ iWon(m) ? 'Victoire' : 'Défaite' }}</span>
              <PButton
                v-if="m.rounds.length"
                color="neutral"
                icon="i-lucide-play"
                @click="replay(m)"
              >
                Revoir
              </PButton>
            </template>
          </li>
        </ul>
      </section>

      <!-- Tableau (v5) -->
      <section
        v-if="t.matches.length"
        class="block"
      >
        <h2 class="block__title font-display">
          Tableau
        </h2>
        <TournamentBracket
          :tournament="t"
          :me="me"
          @replay="replay"
        />
      </section>

      <!-- Préparation (inscrit·e) -->
      <template v-if="a">
        <section
          v-if="a.myTeam.length"
          class="block"
        >
          <h2 class="block__title font-display">
            Mon équipe
            <span
              v-if="a.myTeamLocked"
              class="lock-chip"
            ><UIcon
              name="i-lucide-lock"
              class="size-3"
            /> figée</span>
          </h2>
          <div class="team">
            <TeamCard
              v-for="c in a.myTeam"
              :key="c.position"
              :member="toMember(c)"
              size="sm"
              :interactive="false"
            />
          </div>
        </section>

        <!-- Types conseillés -->
        <section
          v-if="a.toPrivilege.length || a.toAvoid.length"
          class="block"
        >
          <h2 class="block__title font-display">
            Stratégie de types
          </h2>
          <div class="types">
            <div
              v-if="a.toPrivilege.length"
              class="types__col"
            >
              <span class="types__label types__label--good">À privilégier</span>
              <span class="types__chips">
                <span
                  v-for="r in a.toPrivilege"
                  :key="r.type"
                  class="tchip"
                  :style="{ '--tc': typeColor(r.type) }"
                >{{ r.type }} <b>+{{ r.netScore }}</b></span>
              </span>
            </div>
            <div
              v-if="a.toAvoid.length"
              class="types__col"
            >
              <span class="types__label types__label--bad">À éviter</span>
              <span class="types__chips">
                <span
                  v-for="r in a.toAvoid"
                  :key="r.type"
                  class="tchip tchip--muted"
                  :style="{ '--tc': typeColor(r.type) }"
                >{{ r.type }} <b>{{ r.netScore }}</b></span>
              </span>
            </div>
          </div>
        </section>

        <!-- Matchups -->
        <section
          v-if="matchups.length"
          class="block"
        >
          <h2 class="block__title font-display">
            Mes matchups <span class="block__note">({{ matchups.length }} adversaires)</span>
          </h2>
          <div class="matchups">
            <div
              v-for="(m, i) in matchups"
              :key="i"
              class="mu"
            >
              <TourneyAvatar
                :src="m.avatarUrl"
                :shiny="m.avatarIsShiny"
                :size="38"
                :alt="m.username"
              />
              <div class="mu__body">
                <div class="mu__top">
                  <span class="mu__name">{{ m.username }}</span>
                  <span
                    class="mu__pct tabular"
                    :style="{ color: probColor(m.winProbability) }"
                  >{{ m.winProbability }}%</span>
                </div>
                <div class="mu__bar">
                  <i
                    :style="{ width: m.winProbability + '%', background: probColor(m.winProbability) }"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </template>

      <!-- Participants -->
      <section
        v-if="t.participants.length"
        class="block"
      >
        <h2 class="block__title font-display">
          Participants <span class="block__note">({{ t.participants.length }})</span>
        </h2>
        <div class="parts">
          <div
            v-for="p in t.participants"
            :key="p.userId"
            class="part"
          >
            <TourneyAvatar
              :src="p.avatarUrl"
              :shiny="p.avatarIsShiny"
              :size="34"
              :alt="p.username"
            />
            <span class="part__name">{{ p.username }}</span>
          </div>
        </div>
      </section>
    </template>

    <!-- Historique des tournois (v5) -->
    <UModal
      v-model:open="historyOpen"
      title="Tournois passés"
    >
      <template #body>
        <div
          v-if="historyLoading"
          class="hist__load"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-5 animate-spin"
          />
        </div>
        <p
          v-else-if="!history.length"
          class="hist__empty"
        >
          Aucun tournoi enregistré pour le moment.
        </p>
        <ul
          v-else
          class="hist"
        >
          <li
            v-for="h in history"
            :key="h.id"
            class="hist__row"
          >
            <div class="hist__text">
              <b>Tournoi du {{ dateShort(h.date) }}</b>
              <span class="hist__sub">{{ h.participantCount }} participant{{ h.participantCount > 1 ? 's' : '' }} · cagnotte {{ h.prizePool }} 🪙 · {{ STATUS[h.status].label }}</span>
            </div>
            <PButton
              color="neutral"
              :loading="viewLoading === h.id"
              :disabled="viewLoading !== null && viewLoading !== h.id"
              @click="viewPast(h.id)"
            >
              Voir
            </PButton>
          </li>
        </ul>
      </template>
    </UModal>

    <!-- Détail d'un tournoi passé -->
    <UModal
      v-model:open="detailOpen"
      :title="`Tournoi du ${pastDate}`"
      :ui="{ content: 'max-w-2xl' }"
    >
      <template #body>
        <div
          v-if="past"
          class="detail"
        >
          <div
            v-if="pastResults.length"
            class="results"
          >
            <div
              v-for="r in pastResults"
              :key="r.placement"
              class="res"
              :class="{ 'res--podium': r.placement <= 3 }"
            >
              <span class="res__place">{{ medalFor(r.placement) }}</span>
              <TourneyAvatar
                :src="r.avatarUrl"
                :shiny="r.avatarIsShiny"
                :size="34"
                :alt="r.username"
              />
              <span class="res__name">{{ r.username }}</span>
              <span
                v-if="r.prize"
                class="res__prize tabular"
              ><CoinChip size="sm" />{{ r.prize }}</span>
            </div>
          </div>
          <p
            v-else
            class="hist__empty"
          >
            {{ STATUS[past.status].label }} — {{ past.participants.length }} participant{{ past.participants.length > 1 ? 's' : '' }}.
          </p>
          <TournamentBracket
            v-if="past.matches.length"
            :tournament="past"
            :me="me"
            @replay="replayPast"
          />
        </div>
      </template>
    </UModal>

    <!-- Confirmation inscription -->
    <ConfirmDialog
      v-model:open="registerOpen"
      title="S'inscrire au tournoi ?"
      :message="`L'inscription coûte ${TOURNAMENT_ENTRY_FEE} 🪙, prélevés sur ta bourse ${payRegion} — si tu gagnes, la récompense y sera versée. Ton équipe actuelle sera figée jeudi 11:55 pour les combats de jeudi 12:00.`"
      :confirm-label="`S'inscrire (${TOURNAMENT_ENTRY_FEE} 🪙)`"
      :loading="registering"
      @confirm="confirmRegister"
    />
  </div>
</template>

<style scoped>
.tn { display: flex; flex-direction: column; gap: 16px; }
.tn__head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.tn__title-wrap { display: flex; align-items: center; gap: 12px; }
.tn__pay { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.tn__pay-label { font-size: .84rem; color: var(--ui-text-muted); }
.tn__title { font-weight: 700; font-size: 1.7rem; margin: 0; }
.tn__status {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .74rem;
  padding: 4px 12px;
  border-radius: 999px;
}
.tn__status--open { color: #3f9e66; background: color-mix(in oklab, #5bbf82 18%, transparent); }
.tn__status--closed { color: #cc6f16; background: color-mix(in oklab, #f59333 18%, transparent); }
.tn__status--live { color: #fff; background: var(--color-poke-500); box-shadow: 0 2px 0 var(--color-poke-700); }
.tn__status--done { color: var(--ui-text-muted); background: var(--ui-bg-accented); }

.tn__load { display: flex; flex-direction: column; gap: 12px; }
.tn__empty { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; padding: 34px 16px; color: var(--ui-text-muted); }
.tn__empty .font-display { font-weight: 700; font-size: 1.1rem; color: var(--ui-text-highlighted); }
.tn__empty-sub { font-size: .85rem; }

.recap { display: flex; flex-wrap: wrap; gap: 10px 30px; align-items: flex-start; }
.recap__cell { display: flex; flex-direction: column; gap: 2px; }
.recap__k { font-size: .72rem; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: var(--ui-text-dimmed); }
.recap__v { font-family: var(--font-display); font-weight: 700; font-size: 1.05rem; color: var(--ui-text-highlighted); }
.recap__v::first-letter { text-transform: uppercase; }
.recap__cell--pool { margin-left: auto; text-align: right; align-items: flex-end; }
.recap__prizes { display: flex; gap: 10px; font-size: .74rem; font-weight: 700; color: var(--ui-text-muted); margin-top: 2px; }

.cycle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: .82rem;
  font-weight: 600;
  color: var(--ui-text-muted);
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
  padding: 9px 14px;
  border-radius: 12px;
}

.tn__cta { display: flex; }
.tn__reg, .tn__closed {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-weight: 700;
  font-size: .9rem;
  padding: 9px 16px;
  border-radius: 14px;
}
.tn__reg { color: #3f9e66; background: color-mix(in oklab, #5bbf82 15%, transparent); }
.tn__closed { color: var(--ui-text-muted); background: var(--ui-bg-muted); border: 1px solid var(--ui-border); }

.block { display: flex; flex-direction: column; gap: 12px; }
.block__title { font-weight: 700; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; }
.block__note { font-weight: 600; font-size: .82rem; color: var(--ui-text-dimmed); }
.lock-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: .68rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--ui-text-muted);
  background: var(--ui-bg-accented);
  padding: 2px 8px;
  border-radius: 999px;
}

.team { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 10px; }

.types { display: flex; flex-wrap: wrap; gap: 20px; }
.types__col { display: flex; flex-direction: column; gap: 7px; }
.types__label { font-size: .78rem; font-weight: 800; text-transform: uppercase; letter-spacing: .03em; }
.types__label--good { color: #3f9e66; }
.types__label--bad { color: var(--color-poke-600); }
.types__chips { display: flex; flex-wrap: wrap; gap: 6px; }
.tchip {
  font-size: .8rem;
  font-weight: 700;
  color: #fff;
  background: var(--tc);
  padding: 3px 10px;
  border-radius: 999px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .25);
  text-shadow: 0 1px 1px rgba(0, 0, 0, .2);
}
.tchip b { opacity: .85; }
.tchip--muted { opacity: .82; }

.matchups { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
.mu {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 14px;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
}
.mu__body { flex: 1; min-width: 0; }
.mu__top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.mu__name { font-weight: 700; font-size: .86rem; color: var(--ui-text-highlighted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mu__pct { font-family: var(--font-display); font-weight: 700; font-size: .9rem; flex: none; }
.mu__bar { height: 7px; border-radius: 99px; background: var(--ui-bg-accented); overflow: hidden; margin-top: 5px; }
.mu__bar > i { display: block; height: 100%; border-radius: 99px; transition: width .5s var(--ease-glide); }

.results { display: flex; flex-direction: column; gap: 8px; }
.res {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 14px;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
}
.res--podium { border-color: color-mix(in oklab, #e0a92e 40%, transparent); background: color-mix(in oklab, #f6c453 10%, var(--ui-bg-elevated)); }
.res__place { font-family: var(--font-display); font-weight: 700; font-size: 1.1rem; width: 34px; text-align: center; }
.res__name { flex: 1; font-weight: 700; color: var(--ui-text-highlighted); }
.res__prize { font-family: var(--font-display); font-weight: 700; color: #b06a00; }

.parts { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
.part {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 12px;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
}
.part__name { font-size: .82rem; font-weight: 700; color: var(--ui-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.tn__head-actions { display: flex; align-items: center; gap: 10px; }
.recap__v--adv { display: flex; gap: 6px; flex-wrap: wrap; }
.tchip--biome { background: var(--ui-bg-accented); color: var(--ui-text); text-shadow: none; box-shadow: none; }

.path { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.path__m {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 9px 14px;
  border-radius: 14px;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  font-size: .88rem;
}
.path__m--win { border-color: color-mix(in oklab, #5bbf82 55%, transparent); }
.path__m--lost { border-color: color-mix(in oklab, var(--color-poke-500) 40%, transparent); }
.path__label { font-family: var(--font-display); font-weight: 700; color: var(--ui-text-highlighted); min-width: 7rem; }
.path__opp { color: var(--ui-text-muted); flex: 1; }
.path__res { font-weight: 800; font-size: .76rem; text-transform: uppercase; letter-spacing: .03em; }
.path__m--win .path__res { color: #3f9e66; }
.path__m--lost .path__res { color: var(--color-poke-600); }

.hist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.hist__row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 12px; background: var(--ui-bg-elevated); border: 1px solid var(--ui-border); }
.hist__text { flex: 1; min-width: 0; display: flex; flex-direction: column; font-size: .9rem; }
.hist__sub { font-size: .76rem; color: var(--ui-text-muted); }
.hist__empty { color: var(--ui-text-muted); font-size: .9rem; margin: 0; }
.hist__load { display: grid; place-items: center; padding: 24px; color: var(--ui-text-muted); }
.detail { display: flex; flex-direction: column; gap: 16px; }
</style>
