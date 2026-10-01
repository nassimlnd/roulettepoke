<script setup lang="ts">
import { useStorage } from '@vueuse/core'
import { GENERATIONS, currencyOf, asGeneration, generationRegion, type Generation } from '~/constants/generation'
import { STORAGE_KEYS } from '~/constants/storage-keys'
import type { UUID } from '~/types/api'
import type { ContestPrizeOption, LeagueLegendary } from '~/types/domain'
import {
  CONTEST_ENTRY_COST, CONTEST_STATUS, DISCIPLINE_ICON, DANCE_MAX_ROUNDS, DANCE_POINTS_PER_ROUND,
  contestCandidates, contestDeadline, restrictionLabel, type ContestCandidate
} from '~/utils/contest'

// Page Concours hebdomadaire (v5.0). Inscriptions jeudi → mardi 11:55 (10 🪙
// dans la bourse choisie, le Pokémon quitte la collection), répétition de
// danse unique, dévoilement mardi midi devant trois juges, un Légendaire pour
// le gagnant. Le serveur tient les règles ; la page montre, inscrit, fait
// danser et met en scène.
const contest = useContestStore()
const collection = useCollectionStore()
const wallet = useWalletStore()
const auth = useAuthStore()
const toast = useToast()

const { loading, errorMsg, retry } = usePageData(async () => {
  await contest.ensureFresh()
  collection.ensureFresh().catch(() => {})
})
// Quitter la page referme la consultation d'un concours passé.
onUnmounted(() => {
  contest.viewing = null
})

const current = computed(() => contest.current)
/** Concours affiché : celui qu'on consulte dans l'historique, sinon l'actuel. */
const shown = computed(() => contest.viewing ?? contest.current)
const isPast = computed(() => contest.viewing !== null)
const me = computed(() => auth.userId)

const statusMeta = computed(() => (shown.value ? CONTEST_STATUS[shown.value.status] : null))
const revealLabel = computed(() => (shown.value
  ? new Date(shown.value.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  : ''))
const deadline = computed(() => (shown.value ? contestDeadline(shown.value.date) : ''))
const myEntry = computed(() => shown.value?.entries.find(e => e.userId === me.value) ?? null)
// Classement provisoire : stat + bonus de danse, avant le facteur chance du dévoilement.
const entries = computed(() => [...(shown.value?.entries ?? [])]
  .sort((a, b) => (b.partialScore ?? b.stat) - (a.partialScore ?? a.stat)))
const myDanceBonus = computed(() => myEntry.value?.danceBonus ?? current.value?.myDanceScore ?? null)

// ─── Candidats ────────────────────────────────────────────────────────────────
const candidates = computed(() => (current.value
  ? contestCandidates(collection.cards, current.value.discipline, current.value.restriction)
  : []))
const eligibleCount = computed(() => (current.value
  ? contestCandidates(collection.cards, current.value.discipline, current.value.restriction, Number.POSITIVE_INFINITY).length
  : 0))

// ─── Inscription ──────────────────────────────────────────────────────────────
const picked = ref<ContestCandidate | null>(null)
const registerOpen = computed({
  get: () => picked.value !== null,
  set: (v: boolean) => { if (!v) picked.value = null }
})
const { pending: busy, run } = useAsyncAction()

// La bourse choisie paie les 10 🪙 ET fixe la génération du Légendaire à
// choisir en cas de victoire. Par défaut la région active.
const payWith = ref<Generation>(wallet.activeGeneration)
const payOptions = GENERATIONS.map(g => ({ value: String(g.id), label: g.region }))
const payKey = computed({
  get: () => String(payWith.value),
  set: (v: string) => { payWith.value = asGeneration(Number(v)) }
})
const payRegion = computed(() => generationRegion(payWith.value))
const payBalance = computed(() => wallet.purses[payWith.value] ?? 0)
const canAfford = computed(() => payBalance.value >= CONTEST_ENTRY_COST)

function pick(c: ContestCandidate) {
  payWith.value = wallet.activeGeneration
  picked.value = c
}

function confirmRegister() {
  const c = picked.value
  if (!c) return
  if (!canAfford.value) {
    toast.add({ title: `Il te manque des pièces ${payRegion.value} (inscription : ${CONTEST_ENTRY_COST} 🪙).`, color: 'error' })
    return
  }
  return run(async () => {
    await contest.register(c.card.id, currencyOf(payWith.value))
    picked.value = null
    toast.add({ title: `${c.card.name} est inscrit au concours ! 🎀`, color: 'success', icon: 'i-lucide-check' })
    danceOpen.value = true
  })
}

// ─── Répétition de danse ──────────────────────────────────────────────────────
const danceOpen = ref(false)
async function onDanceDone(rounds: number | null) {
  if (rounds === null) {
    toast.add({ title: 'Répétition reportée — tu peux la jouer tant que les inscriptions sont ouvertes.', icon: 'i-lucide-clock' })
    return
  }
  const ok = await contest.submitDance(rounds)
  const bonus = rounds * DANCE_POINTS_PER_ROUND
  if (ok) {
    toast.add({ title: `Répétition enregistrée : +${bonus} point${bonus > 1 ? 's' : ''} de concours.`, color: 'success', icon: 'i-lucide-music' })
  } else {
    toast.add({ title: 'Répétition non prise en compte : déjà jouée ou fenêtre fermée.', color: 'warning', icon: 'i-lucide-triangle-alert' })
  }
}

// ─── Dévoilement ──────────────────────────────────────────────────────────────
// Proposé une fois par concours terminé (même clé que l'ancien front), puis
// rejouable à volonté depuis les résultats.
const revealSeen = useStorage(STORAGE_KEYS.contestRevealSeen, '')
const revealPromptOpen = ref(false)
const revealOpen = ref(false)
watch(current, (c) => {
  if (!c || c.status !== 'completed' || !c.results.length || revealSeen.value === c.id) return
  revealSeen.value = c.id
  revealPromptOpen.value = true
}, { immediate: true })
function startReveal() {
  revealPromptOpen.value = false
  revealOpen.value = true
}

// ─── Lot du gagnant ───────────────────────────────────────────────────────────
const prizeOpen = ref(false)
const prizeLoading = ref(false)
const prizeOptions = ref<ContestPrizeOption[]>([])
const prizePick = ref<ContestPrizeOption | null>(null)
const prizeConfirmOpen = ref(false)
const prizeRegion = computed(() => (prizeOptions.value[0] ? generationRegion(prizeOptions.value[0].generation) : ''))

async function openPrize() {
  const c = shown.value
  if (!c) return
  prizeOpen.value = true
  prizeLoading.value = true
  try {
    prizeOptions.value = await contest.prizeOptions(c.id)
  } catch (err) {
    prizeOpen.value = false
    toast.add({ title: humanizeError(err), color: 'error' })
  } finally {
    prizeLoading.value = false
  }
}
function onPrizePick(l: LeagueLegendary) {
  prizePick.value = prizeOptions.value.find(o => o.id === l.id) ?? null
  prizeConfirmOpen.value = prizePick.value !== null
}
function confirmPrize() {
  const c = shown.value
  const p = prizePick.value
  if (!c || !p) return
  return run(async () => {
    await contest.claimPrize(c.id, p.id)
    prizeConfirmOpen.value = false
    prizeOpen.value = false
    toast.add({ title: `${p.name} rejoint ta collection ! 🎉`, color: 'success', icon: 'i-lucide-sparkles' })
  })
}

// ─── Historique ───────────────────────────────────────────────────────────────
const historyOpen = ref(false)
const historyLoading = ref(false)
const viewLoading = ref<UUID | null>(null)
const history = computed(() => [...contest.history].sort((a, b) => b.date.localeCompare(a.date)))

async function openHistory() {
  historyOpen.value = true
  historyLoading.value = true
  try {
    await contest.loadHistory()
  } catch (err) {
    toast.add({ title: humanizeError(err), color: 'error' })
  } finally {
    historyLoading.value = false
  }
}
async function viewPast(id: UUID) {
  if (id === current.value?.id) {
    backToCurrent()
    historyOpen.value = false
    return
  }
  viewLoading.value = id
  try {
    await contest.view(id)
    historyOpen.value = false
  } catch (err) {
    toast.add({ title: humanizeError(err), color: 'error' })
  } finally {
    viewLoading.value = null
  }
}
function backToCurrent() {
  contest.viewing = null
}
function dateShort(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
function danceLabel(rounds: number | null, bonus: number | null): string {
  if (rounds === null) return '—'
  return `${rounds}/${DANCE_MAX_ROUNDS} · +${bonus ?? rounds * DANCE_POINTS_PER_ROUND}`
}
</script>

<template>
  <div class="ct">
    <header class="ct__head">
      <div class="ct__title-wrap">
        <h1 class="ct__title font-display">
          Concours
        </h1>
        <span
          v-if="statusMeta"
          class="ct__status"
          :class="`ct__status--${statusMeta.cls}`"
        >{{ statusMeta.label }}</span>
      </div>
      <div class="ct__head-actions">
        <PButton
          color="neutral"
          icon="i-lucide-history"
          @click="openHistory"
        >
          Concours passés
        </PButton>
        <CoinBalance />
      </div>
    </header>

    <div
      v-if="loading"
      class="ct__load"
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

    <!-- Aucun concours -->
    <PPanel
      v-else-if="!shown"
      class="ct__empty"
    >
      <UIcon
        name="i-lucide-drama"
        class="size-8"
      />
      <p class="font-display">
        Aucun concours pour le moment
      </p>
      <p class="ct__empty-sub">
        Les inscriptions ouvrent chaque jeudi — une discipline est tirée au sort, parfois avec une restriction.
      </p>
    </PPanel>

    <template v-else>
      <!-- Consultation d'un concours passé -->
      <div
        v-if="isPast"
        class="past"
      >
        <UIcon
          name="i-lucide-history"
          class="size-4"
        />
        <span>Tu consultes le concours du <b>{{ revealLabel }}</b>.</span>
        <button
          type="button"
          class="past__back"
          @click="backToCurrent"
        >
          Revenir au concours en cours
        </button>
      </div>

      <!-- Bandeau : discipline, restriction, dates -->
      <PPanel class="banner">
        <div class="banner__disc">
          <span class="banner__icon">
            <UIcon
              :name="DISCIPLINE_ICON[shown.discipline]"
              class="size-6"
            />
          </span>
          <div class="banner__text">
            <span class="banner__k">Discipline de la semaine</span>
            <span class="banner__disc-name font-display">{{ shown.discipline }}</span>
            <span class="banner__restr">{{ restrictionLabel(shown.restriction) }}</span>
          </div>
        </div>
        <div class="banner__cells">
          <div
            v-if="shown.status === 'registration_open'"
            class="banner__cell"
          >
            <span class="banner__k">Inscriptions jusqu'au</span>
            <span class="banner__v">{{ deadline }}</span>
          </div>
          <div class="banner__cell">
            <span class="banner__k">Dévoilement</span>
            <span class="banner__v">{{ revealLabel }} · 12:00</span>
          </div>
          <div class="banner__cell">
            <span class="banner__k">Inscrits</span>
            <span class="banner__v tabular">{{ shown.entryCount }}</span>
          </div>
          <div class="banner__cell">
            <span class="banner__k">Lot</span>
            <span class="banner__v">Un Légendaire</span>
          </div>
        </div>
      </PPanel>

      <details class="rules">
        <summary class="rules__sum">
          <UIcon
            name="i-lucide-book-open"
            class="size-4"
          />
          Comment ça marche ?
        </summary>
        <ul class="rules__list">
          <li>Inscription : {{ CONTEST_ENTRY_COST }} 🪙 dans la bourse de ton choix — elle fixe aussi la génération du Légendaire à gagner. Shiny et Légendaires exclus.</li>
          <li>Le Pokémon inscrit quitte ta collection : il te revient si tu ne gagnes pas, il est perdu s'il remporte le concours.</li>
          <li>Score = stat du Pokémon en {{ shown.discipline }} × un facteur chance (±30 %) tiré au dévoilement, + le bonus de danse.</li>
          <li>Répétition de danse : {{ DANCE_POINTS_PER_ROUND }} points par manche réussie, {{ DANCE_MAX_ROUNDS }} manches au plus — une seule tentative, à jouer avant la fin des inscriptions.</li>
          <li>Le gagnant choisit un Légendaire parmi ceux de la génération de son inscription.</li>
        </ul>
      </details>

      <!-- Mon inscription (concours en cours) -->
      <PPanel
        v-if="!isPast && current?.isRegistered && current.status !== 'completed'"
        class="mine"
      >
        <div class="mine__head">
          <UIcon
            name="i-lucide-check"
            class="size-4"
          />
          Inscrit·e — dévoilement {{ revealLabel }} à midi
        </div>
        <div
          v-if="myEntry"
          class="mine__entry"
        >
          <img
            v-if="myEntry.imageUrl"
            :src="myEntry.imageUrl"
            :alt="myEntry.cardName"
            class="mine__img"
          >
          <div class="mine__who">
            <b>{{ myEntry.cardName }}</b>
            <span class="mine__stat">{{ shown.discipline }} : <b class="tabular">{{ myEntry.stat }}</b></span>
          </div>
        </div>
        <div class="mine__dance">
          <template v-if="contest.dancePending">
            <p>Ta répétition de danse t'attend : jusqu'à +{{ DANCE_MAX_ROUNDS * DANCE_POINTS_PER_ROUND }} points, une seule tentative.</p>
            <PButton
              icon="i-lucide-music"
              @click="danceOpen = true"
            >
              Jouer la répétition
            </PButton>
          </template>
          <p v-else-if="myDanceBonus !== null">
            Répétition jouée : <b class="tabular">+{{ myDanceBonus }}</b> point{{ myDanceBonus > 1 ? 's' : '' }} de concours.
          </p>
        </div>
      </PPanel>

      <!-- Inscrire un Pokémon -->
      <section
        v-else-if="!isPast && current?.status === 'registration_open'"
        class="block"
      >
        <h2 class="block__title font-display">
          Inscrire un Pokémon
          <span
            v-if="collection.cards.length"
            class="block__note"
          >{{ eligibleCount }} éligible{{ eligibleCount > 1 ? 's' : '' }}</span>
        </h2>
        <p class="block__lead">
          Tes meilleurs candidats en {{ current.discipline }}, classés par stat. Le Pokémon choisi quitte ta collection le temps du concours.
        </p>
        <div
          v-if="!collection.cards.length"
          class="cands"
          aria-busy="true"
        >
          <USkeleton
            v-for="i in 6"
            :key="i"
            class="h-28 w-24 rounded-2xl"
          />
        </div>
        <UAlert
          v-else-if="!candidates.length"
          color="warning"
          variant="soft"
          icon="i-lucide-info"
          title="Aucun Pokémon éligible dans ta collection."
          :description="`${restrictionLabel(current.restriction)} — hors shiny et Légendaires.`"
        />
        <div
          v-else
          class="cands"
        >
          <button
            v-for="c in candidates"
            :key="c.card.id"
            type="button"
            class="cand"
            :aria-label="`Inscrire ${c.card.name} (${c.stat})`"
            @click="pick(c)"
          >
            <TradeCardMini
              :name="c.card.name"
              :image-url="c.card.imageUrl"
              :rarity="c.card.rarity"
            />
            <span class="cand__stat tabular">{{ c.stat }}</span>
          </button>
        </div>
      </section>

      <span
        v-else-if="!isPast && current?.status === 'registration_closed'"
        class="ct__closed"
      >
        <UIcon
          name="i-lucide-lock"
          class="size-4"
        /> Inscriptions closes — le jury délibère, dévoilement à midi.
      </span>

      <!-- Résultats (terminé) -->
      <PPanel v-if="shown.status === 'completed' && shown.results.length">
        <ContestResults
          :contest="shown"
          :me="me"
          @reveal="revealOpen = true"
          @claim="openPrize"
        />
      </PPanel>

      <!-- Inscrits -->
      <section
        v-if="entries.length && shown.status !== 'completed'"
        class="block"
      >
        <h2 class="block__title font-display">
          Inscrits <span class="block__note">({{ entries.length }})</span>
        </h2>
        <div class="tablewrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>Joueur</th>
                <th>Pokémon</th>
                <th class="right">
                  {{ shown.discipline }}
                </th>
                <th class="right">
                  Danse
                </th>
                <th class="right">
                  Provisoire
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="e in entries"
                :key="e.userId"
                :class="{ tbl__mine: e.userId === me }"
              >
                <td class="strong">
                  {{ e.username }}
                </td>
                <td class="poke">
                  <img
                    v-if="e.imageUrl"
                    :src="e.imageUrl"
                    :alt="e.cardName"
                  >
                  <span>{{ e.cardName }}</span>
                </td>
                <td class="right tabular">
                  {{ e.stat }}
                </td>
                <td class="right tabular muted">
                  {{ danceLabel(e.danceRounds, e.danceBonus) }}
                </td>
                <td class="right tabular strong">
                  {{ e.partialScore ?? e.stat }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <!-- ═══ Confirmation d'inscription ═══ -->
    <UModal
      v-model:open="registerOpen"
      :title="`Inscrire ${picked?.card.name ?? ''} ?`"
      :ui="{ footer: 'justify-end gap-2' }"
    >
      <template #body>
        <div
          v-if="picked && current"
          class="reg"
        >
          <div class="reg__card">
            <TradeCardMini
              :name="picked.card.name"
              :image-url="picked.card.imageUrl"
              :rarity="picked.card.rarity"
            />
            <div class="reg__stat">
              <span class="banner__k">{{ current.discipline }}</span>
              <b class="reg__stat-v font-display tabular">{{ picked.stat }}</b>
            </div>
          </div>
          <div class="reg__warn">
            <UIcon
              name="i-lucide-triangle-alert"
              class="size-5"
            />
            <p>
              <b>{{ picked.card.name }}</b> quitte ta collection le temps du concours : il revient si tu ne gagnes pas, il est <b>perdu</b> s'il remporte le concours.
              Tu en possèdes {{ picked.card.quantity }}.
            </p>
          </div>
          <div class="reg__pay">
            <span class="reg__pay-label">Payer avec</span>
            <PSegmented
              v-model="payKey"
              :options="payOptions"
              size="sm"
              a11y="radio"
              aria-label="Bourse d'inscription"
            />
            <span class="reg__pay-label tabular">{{ payBalance.toLocaleString('fr-FR') }} 🪙 dispo</span>
          </div>
          <p class="reg__note">
            En cas de victoire, tu choisiras un Légendaire de {{ payRegion }}.
          </p>
        </div>
      </template>
      <template #footer>
        <PButton
          color="neutral"
          :disabled="busy"
          @click="picked = null"
        >
          Annuler
        </PButton>
        <PButton
          :disabled="!canAfford"
          :loading="busy"
          @click="confirmRegister"
        >
          {{ canAfford ? `S'inscrire (${CONTEST_ENTRY_COST} 🪙)` : 'Solde insuffisant' }}
        </PButton>
      </template>
    </UModal>

    <DanceGame
      v-model:open="danceOpen"
      @done="onDanceDone"
    />

    <ConfirmDialog
      v-model:open="revealPromptOpen"
      title="🏅 Les résultats sont tombés !"
      message="Le jury a rendu son verdict. Assister au dévoilement ?"
      confirm-label="Voir le dévoilement"
      cancel-label="Plus tard"
      @confirm="startReveal"
    />

    <ContestReveal
      v-if="shown"
      v-model:open="revealOpen"
      :contest="shown"
      :me="me"
    />

    <!-- ═══ Choix du Légendaire ═══ -->
    <UModal
      v-model:open="prizeOpen"
      title="Choisis ton Légendaire"
      :ui="{ content: 'max-w-2xl' }"
    >
      <template #body>
        <div class="prize">
          <p class="prize__lead">
            Ton Pokémon est parti en tournée internationale. En échange, un Légendaire{{ prizeRegion ? ` de ${prizeRegion}` : '' }} rejoint ta collection.
          </p>
          <div
            v-if="prizeLoading"
            class="prize__load"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="size-5 animate-spin"
            />
          </div>
          <LegendaryStrip
            v-else
            :legendaries="prizeOptions"
            pickable
            :busy="busy"
            @pick="onPrizePick"
          />
        </div>
      </template>
    </UModal>

    <ConfirmDialog
      v-model:open="prizeConfirmOpen"
      :title="`Choisir ${prizePick?.name ?? ''} ?`"
      message="Ce choix est définitif : le Légendaire rejoint ta collection tout de suite."
      confirm-label="C'est lui !"
      :loading="busy"
      @confirm="confirmPrize"
    />

    <!-- ═══ Historique ═══ -->
    <UModal
      v-model:open="historyOpen"
      title="Concours passés"
    >
      <template #body>
        <div
          v-if="historyLoading"
          class="prize__load"
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
          Aucun concours enregistré pour le moment.
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
            <UIcon
              :name="DISCIPLINE_ICON[h.discipline]"
              class="size-5 hist__icon"
            />
            <div class="hist__text">
              <b>{{ h.discipline }}</b>
              <span class="hist__sub">{{ dateShort(h.date) }} · {{ h.entryCount }} inscrit{{ h.entryCount > 1 ? 's' : '' }} · {{ CONTEST_STATUS[h.status].label }}</span>
            </div>
            <PButton
              color="neutral"
              :loading="viewLoading === h.id"
              :disabled="viewLoading !== null && viewLoading !== h.id"
              @click="viewPast(h.id)"
            >
              {{ h.id === current?.id ? 'En cours' : 'Voir' }}
            </PButton>
          </li>
        </ul>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.ct { display: flex; flex-direction: column; gap: 16px; }
.ct__head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.ct__head-actions { display: flex; align-items: center; gap: 10px; }
.ct__title-wrap { display: flex; align-items: center; gap: 12px; }
.ct__title { font-weight: 700; font-size: 1.7rem; margin: 0; }
.ct__status {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .74rem;
  padding: 4px 12px;
  border-radius: 999px;
}
.ct__status--open { color: #3f9e66; background: color-mix(in oklab, #5bbf82 18%, transparent); }
.ct__status--closed { color: #cc6f16; background: color-mix(in oklab, #f59333 18%, transparent); }
.ct__status--live { color: #fff; background: #c65b9d; box-shadow: 0 2px 0 #9a3f78; }
.ct__status--done { color: var(--ui-text-muted); background: var(--ui-bg-accented); }

.ct__load { display: flex; flex-direction: column; gap: 12px; }
.ct__empty { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; padding: 34px 16px; color: var(--ui-text-muted); }
.ct__empty .font-display { font-weight: 700; font-size: 1.1rem; color: var(--ui-text-highlighted); }
.ct__empty-sub { font-size: .85rem; max-width: 30rem; }

.past {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: .84rem;
  color: var(--ui-text-muted);
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
  padding: 8px 14px;
  border-radius: 12px;
}
.past__back {
  margin-left: auto;
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-weight: 700;
  color: var(--color-poke-600);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.banner { display: flex; flex-wrap: wrap; gap: 16px 30px; align-items: center; }
.banner__disc { display: flex; align-items: center; gap: 14px; }
.banner__icon {
  flex: none;
  width: 54px;
  height: 54px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  color: #c65b9d;
  background: color-mix(in oklab, #c65b9d 15%, transparent);
}
.banner__text { display: flex; flex-direction: column; gap: 1px; }
.banner__k { font-size: .72rem; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: var(--ui-text-dimmed); }
.banner__disc-name { font-weight: 700; font-size: 1.35rem; color: var(--ui-text-highlighted); line-height: 1.1; }
.banner__restr { font-size: .84rem; font-weight: 600; color: var(--ui-text-muted); }
.banner__cells { display: flex; flex-wrap: wrap; gap: 10px 26px; margin-left: auto; }
.banner__cell { display: flex; flex-direction: column; gap: 2px; }
.banner__v { font-family: var(--font-display); font-weight: 700; font-size: .98rem; color: var(--ui-text-highlighted); }
.banner__v::first-letter { text-transform: uppercase; }

.rules {
  border: 1px solid var(--ui-border);
  border-radius: 12px;
  background: var(--ui-bg-muted);
  padding: 0 14px;
}
.rules__sum {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 0;
  font-size: .84rem;
  font-weight: 700;
  color: var(--ui-text-muted);
  cursor: pointer;
  list-style: none;
}
.rules__sum::-webkit-details-marker { display: none; }
.rules__list { margin: 0; padding: 0 0 12px 18px; display: flex; flex-direction: column; gap: 6px; font-size: .86rem; color: var(--ui-text-toned); line-height: 1.45; }

.mine { display: flex; flex-direction: column; gap: 12px; border-color: color-mix(in oklab, #5bbf82 45%, transparent); }
.mine__head { display: inline-flex; align-items: center; gap: 7px; font-weight: 700; font-size: .9rem; color: #3f9e66; }
.mine__entry { display: flex; align-items: center; gap: 12px; }
.mine__img { width: 56px; height: 56px; object-fit: contain; }
.mine__who { display: flex; flex-direction: column; gap: 2px; font-size: .92rem; }
.mine__stat { font-size: .82rem; color: var(--ui-text-muted); }
.mine__dance { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: .88rem; color: var(--ui-text-toned); }
.mine__dance p { margin: 0; }

.block { display: flex; flex-direction: column; gap: 12px; }
.block__title { font-weight: 700; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; margin: 0; }
.block__note { font-weight: 600; font-size: .82rem; color: var(--ui-text-dimmed); }
.block__lead { font-size: .86rem; color: var(--ui-text-muted); margin: -4px 0 0; }

.cands { display: flex; flex-wrap: wrap; gap: 10px; }
.cand {
  position: relative;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg-elevated);
  border-radius: 16px;
  padding: 10px 6px 8px;
  cursor: pointer;
  transition: transform .18s var(--ease-pop), border-color .18s ease;
}
.cand:hover, .cand:focus-visible { transform: translateY(-3px); border-color: #c65b9d; outline: none; }
.cand__stat {
  position: absolute;
  top: -8px;
  right: -6px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .78rem;
  color: #fff;
  background: #c65b9d;
  padding: 2px 8px;
  border-radius: 999px;
  box-shadow: 0 2px 0 #9a3f78;
}

.ct__closed {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-weight: 700;
  font-size: .9rem;
  padding: 9px 16px;
  border-radius: 14px;
  color: var(--ui-text-muted);
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
  align-self: flex-start;
}

.tablewrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--ui-border); }
.tbl { width: 100%; border-collapse: collapse; font-size: .88rem; }
.tbl th {
  text-align: left;
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--ui-text-muted);
  font-weight: 700;
  padding: 9px 12px;
  background: var(--ui-bg-muted);
  white-space: nowrap;
}
.tbl td { padding: 8px 12px; border-top: 1px solid var(--ui-border); }
.tbl .right { text-align: right; }
.tbl .strong { font-weight: 700; color: var(--ui-text); }
.tbl .muted { color: var(--ui-text-muted); }
.tbl .poke { display: flex; align-items: center; gap: 8px; }
.tbl .poke img { width: 32px; height: 32px; object-fit: contain; }
.tbl__mine td { background: color-mix(in oklab, #c65b9d 8%, transparent); }

.reg { display: flex; flex-direction: column; gap: 14px; }
.reg__card { display: flex; align-items: center; gap: 18px; }
.reg__stat { display: flex; flex-direction: column; gap: 2px; }
.reg__stat-v { font-size: 1.6rem; color: #c65b9d; line-height: 1; }
.reg__warn { display: flex; gap: 10px; align-items: flex-start; font-size: .88rem; line-height: 1.5; color: var(--ui-text-toned); }
.reg__warn p { margin: 0; }
.reg__warn :deep(svg) { color: var(--color-poke-500); flex: none; margin-top: 2px; }
.reg__pay { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.reg__pay-label { font-size: .84rem; color: var(--ui-text-muted); }
.reg__note { font-size: .82rem; color: var(--ui-text-muted); margin: 0; }

.prize { display: flex; flex-direction: column; gap: 14px; }
.prize__lead { font-size: .9rem; color: var(--ui-text-toned); margin: 0; }
.prize__load { display: grid; place-items: center; padding: 24px; color: var(--ui-text-muted); }

.hist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.hist__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 12px;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
}
.hist__icon { color: #c65b9d; flex: none; }
.hist__text { flex: 1; min-width: 0; display: flex; flex-direction: column; font-size: .9rem; }
.hist__sub { font-size: .76rem; color: var(--ui-text-muted); }
.hist__empty { color: var(--ui-text-muted); font-size: .9rem; margin: 0; }
</style>
