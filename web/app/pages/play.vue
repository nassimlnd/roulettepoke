<script setup lang="ts">
import type { Biome } from '~/types/api'
import type { DomainCard, RollOutcome } from '~/types/domain'
import type { RevealView } from '~/components/game/BoosterReveal.vue'
import type { BatchTile } from '~/components/game/BoosterRevealBatch.vue'
import type { RevealMode } from '~/stores/preferences'
import { BASE_ROLL_COST } from '~/stores/roll'
import { eventRepo } from '~/repositories'
import { biomeSlug } from '~/utils/poke'

// Page « Ouverture de booster » (direction Mochidex). Trois temps :
//   idle → carrousel de boosters par biome + bouton d'ouverture
//   opening → tourbillon (OrbitSwirl) pendant le tirage serveur (~3 s)
//   reveal → révélation (carte / pièces / charme / choix) via BoosterReveal
const auth = useAuthStore()
const wallet = useWalletStore()
const prefs = usePreferencesStore()
const rollStore = useRollStore()
const collection = useCollectionStore()
const inventory = useInventoryStore()
const { celebrate, tierFor } = useCelebration()

// Sac à dos : Charme Chroma (shiny ×2) + tickets biome/type (filtrent le prochain
// tirage, usage unique, exclusifs). Un ticket actif prend le pas sur le biome payant.
const bagOpen = ref(false)
const deactivating = ref(false)
const hasActiveTicket = computed(() => inventory.hasActiveTicket)
const activeTicketLabel = computed(() => inventory.activeBiomeName ?? inventory.activeTypeName ?? '')
const charmeRolls = computed(() => auth.user?.charme_chroma_rolls ?? 0)
const bagCount = computed(() =>
  inventory.charmeCount
  + inventory.biomeTickets.reduce((n, t) => n + t.quantity, 0)
  + inventory.typeTickets.reduce((n, t) => n + t.quantity, 0))

// Biome effectivement tiré : biome payant choisi, sinon le ticket biome actif.
function rollBiome(): string | null {
  return prefs.selectedBiome || inventory.activeBiomeName || null
}

async function deactivateActiveTicket() {
  deactivating.value = true
  try {
    if (inventory.activeBiomeTicket) await inventory.deactivateBiomeTicket()
    else await inventory.deactivateTypeTicket()
  } catch (err) {
    errorMsg.value = humanizeError(err)
  } finally {
    deactivating.value = false
  }
}

// Un ticket actif remplace le filtre biome payant : on réinitialise la sélection
// pour éviter qu'ils se combinent silencieusement (règle reprise du jeu original).
watch(hasActiveTicket, (on) => {
  if (on && prefs.selectedBiome) prefs.selectedBiome = ''
})

type Phase = 'idle' | 'opening' | 'reveal'
const phase = ref<Phase>('idle')
const outcome = ref<RollOutcome | null>(null)
const resolvedCard = ref<{ card: DomainCard, isNew: boolean, quantity?: number } | null>(null)
const choiceResolving = ref(false)
const errorMsg = ref('')

// Ouverture groupée « ×5 » : la grille de révélation vit dans batchTiles.
const BATCH_SIZE = 5
const batchTiles = ref<BatchTile[] | null>(null)
const batchCount = ref(0)

const motionOn = computed(() => !prefs.effectiveReducedMotion)

// Durée du tourbillon selon la préférence de révélation (le mouvement réduit
// force l'instantané). Le tirage serveur reste attendu quoi qu'il arrive.
const REVEAL_MS: Record<RevealMode, number> = { visible: 3000, smart: 1400, hidden: 60 }
const orbitMs = computed(() => (motionOn.value ? REVEAL_MS[prefs.revealMode] : 60))

// ─── Carrousel de boosters ────────────────────────────────────────────────────
interface BoosterOption { biome: string, cost: number, owned?: number, total?: number }
const boosters = computed<BoosterOption[]>(() => [
  { biome: '', cost: BASE_ROLL_COST },
  ...rollStore.biomes.map(b => ({ biome: b.biome, cost: b.cost, owned: b.ownedCount, total: b.cardCount }))
])
const selected = computed(() => prefs.selectedBiome)
// Un ticket actif filtre le tirage au coût de base (le ticket EST l'accès au biome).
const currentCost = computed(() =>
  hasActiveTicket.value ? BASE_ROLL_COST : rollStore.costForBiome(prefs.selectedBiome))
const currentTint = computed(() =>
  prefs.selectedBiome ? `var(--color-biome-${biomeSlug(prefs.selectedBiome as Biome)})` : 'var(--color-poke-500)')

function selectBooster(biome: string) {
  prefs.selectedBiome = biome
  errorMsg.value = ''
}

// ─── Solde / accessibilité ──────────────────────────────────────────────────
const balance = computed(() => wallet.balance)
const affordable = computed(() => wallet.canAfford(currentCost.value))
const shortfall = computed(() => Math.max(0, currentCost.value - (wallet.balance ?? 0)))
const batchCost = computed(() => currentCost.value * BATCH_SIZE)
const affordableBatch = computed(() => wallet.canAfford(batchCost.value))

// ─── Vue de révélation dérivée de l'état ──────────────────────────────────────
const revealView = computed<RevealView | null>(() => {
  if (resolvedCard.value) {
    return { kind: 'card', card: resolvedCard.value.card, isNew: resolvedCard.value.isNew, quantity: resolvedCard.value.quantity }
  }
  const o = outcome.value
  if (o?.kind === 'coins') return { kind: 'coins', amount: o.amount }
  if (o?.kind === 'charme') return { kind: 'charme' }
  if (o?.kind === 'choice') return { kind: 'choice', left: o.left, right: o.right, resolving: choiceResolving.value }
  return null
})

// ─── Ouverture ────────────────────────────────────────────────────────────────
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function qtyFor(card: DomainCard, isNew: boolean): number {
  const existing = collection.cards.find(c => c.id === card.id)
  return isNew ? 1 : (existing?.quantity ?? 0) + 1
}

async function open() {
  if (phase.value !== 'idle') return
  if (!affordable.value) {
    errorMsg.value = `Il te manque ${shortfall.value} pièce${shortfall.value > 1 ? 's' : ''}. Gagne-en via l'entraînement, le jackpot ou le bonus quotidien.`
    return
  }
  errorMsg.value = ''
  outcome.value = null
  resolvedCard.value = null
  phase.value = 'opening'
  const biome = rollBiome()
  const hadTicket = hasActiveTicket.value
  const boosted = charmeRolls.value > 0

  try {
    // Le tourbillon joue ~3 s ; la carte n'est révélée qu'une fois le serveur prêt.
    const [o] = await Promise.all([
      rollStore.perform(biome, currentCost.value),
      wait(orbitMs.value)
    ])
    outcome.value = o
    if (o.kind === 'card') {
      resolvedCard.value = { card: o.card, isNew: o.isNew, quantity: qtyFor(o.card, o.isNew) }
      celebrate(tierFor(o.card))
      refreshCollection()
      if (boosted) auth.consumeCharmeRoll() // le backend ne décrémente que les tirages normaux
    }
    phase.value = 'reveal'
    refreshBalance()
    if (hadTicket) inventory.refresh().catch(() => {}) // ticket usage unique : peut être consommé
  } catch (err) {
    errorMsg.value = humanizeError(err)
    phase.value = 'idle'
  }
}

// ─── Ouverture ×5 ──────────────────────────────────────────────────────────────
const TIER_ORDER = ['common', 'rare', 'epic', 'legendary', 'shiny', 'shiny-legendary']

// Construit les tuiles de révélation : la quantité tient compte des doublons
// tirés DANS ce même lot (tally local + quantité déjà en collection).
function buildTiles(outcomes: RollOutcome[]): BatchTile[] {
  const seen = new Map<string, number>()
  const qtyOf = (card: DomainCard): number => {
    const prior = collection.cards.find(c => c.id === card.id)?.quantity ?? 0
    const n = (seen.get(card.id) ?? 0) + 1
    seen.set(card.id, n)
    return prior + n
  }
  return outcomes.map<BatchTile>((o) => {
    if (o.kind === 'card') return { kind: 'card', card: o.card, isNew: o.isNew, quantity: qtyOf(o.card) }
    if (o.kind === 'coins') return { kind: 'coins', amount: o.amount }
    if (o.kind === 'charme') return { kind: 'charme' }
    return { kind: 'choice', choiceId: o.choiceId, left: o.left, right: o.right, resolving: false, resolved: null }
  })
}

function celebrateBest(cards: DomainCard[]) {
  if (!cards.length) return
  const best = cards.reduce((a, b) =>
    (TIER_ORDER.indexOf(tierFor(b)) > TIER_ORDER.indexOf(tierFor(a)) ? b : a))
  celebrate(tierFor(best))
}

async function open5() {
  if (phase.value !== 'idle') return
  // Les tickets sont à usage unique : l'ouverture ×5 ne s'y prête pas (le ticket
  // serait consommé au 1er tirage). On la réserve aux tirages sans ticket.
  if (hasActiveTicket.value) return
  if (!affordableBatch.value) {
    const miss = Math.max(0, batchCost.value - (wallet.balance ?? 0))
    errorMsg.value = `Il te manque ${miss} pièce${miss > 1 ? 's' : ''} pour ouvrir 5 paquets.`
    return
  }
  errorMsg.value = ''
  outcome.value = null
  resolvedCard.value = null
  batchTiles.value = null
  batchCount.value = 0
  phase.value = 'opening'
  const biome = prefs.selectedBiome || null

  try {
    const [{ outcomes, error }] = await Promise.all([
      rollStore.performBatch(biome, currentCost.value, BATCH_SIZE),
      wait(orbitMs.value)
    ])
    if (!outcomes.length) {
      errorMsg.value = humanizeError(error)
      phase.value = 'idle'
      return
    }
    batchTiles.value = buildTiles(outcomes)
    batchCount.value = outcomes.length
    celebrateBest(outcomes.flatMap(o => (o.kind === 'card' ? [o.card] : [])))
    refreshCollection()
    // Échec partiel (ex. quota atteint en cours) : on révèle le butin acquis.
    if (error) {
      errorMsg.value = `Ouverture interrompue après ${outcomes.length} paquet${outcomes.length > 1 ? 's' : ''} — ${humanizeError(error)}`
    }
    phase.value = 'reveal'
    refreshBalance()
  } catch (err) {
    errorMsg.value = humanizeError(err)
    phase.value = 'idle'
  }
}

async function pickBatchChoice(index: number, card: DomainCard) {
  const tiles = batchTiles.value
  const tile = tiles?.[index]
  if (!tile || tile.kind !== 'choice' || tile.resolving || tile.resolved) return
  tile.resolving = true
  try {
    const { card: chosen, isNew } = await eventRepo.confirmCardChoice(useApi(), tile.choiceId, card.id)
    tile.resolved = { card: chosen, isNew, quantity: qtyFor(chosen, isNew) }
    celebrate(tierFor(chosen))
    refreshCollection()
    refreshBalance()
  } catch (err) {
    errorMsg.value = humanizeError(err)
  } finally {
    tile.resolving = false
  }
}

// ─── Choix (event card-choice) : on retient une carte sur deux ────────────────
async function pickChoice(card: DomainCard) {
  const o = outcome.value
  if (choiceResolving.value || o?.kind !== 'choice') return
  choiceResolving.value = true
  try {
    const { card: chosen, isNew } = await eventRepo.confirmCardChoice(useApi(), o.choiceId, card.id)
    resolvedCard.value = { card: chosen, isNew, quantity: qtyFor(chosen, isNew) }
    celebrate(tierFor(chosen))
    refreshCollection()
    refreshBalance()
  } catch (err) {
    errorMsg.value = humanizeError(err)
  } finally {
    choiceResolving.value = false
  }
}

function finish() {
  phase.value = 'idle'
  outcome.value = null
  resolvedCard.value = null
  batchTiles.value = null
  batchCount.value = 0
  errorMsg.value = ''
}

// ─── Synchronisations ─────────────────────────────────────────────────────────
function refreshCollection() {
  collection.invalidate()
  collection.ensureFresh(true).catch(() => {})
}
async function refreshBalance() {
  try {
    const { user } = await useApi()<{ user: { coins: number } }>('/auth/me')
    if (user) wallet.reconcile(user.coins, 'roll-refresh')
  } catch { /* silencieux */ }
}

onMounted(() => {
  rollStore.ensureBiomes().catch(() => {})
  collection.ensureFresh().catch(() => {})
  inventory.ensureFresh().catch(() => {})
})
</script>

<template>
  <div class="play">
    <!-- Bandeau utilisateur -->
    <div class="play__bar">
      <div class="play__who">
        <UAvatar
          :src="auth.user?.avatar_url || undefined"
          :alt="auth.user?.username"
          icon="i-lucide-user"
          size="sm"
        />
        <span class="font-medium">{{ auth.user?.username }}</span>
      </div>
      <div class="play__actions">
        <button
          type="button"
          class="bag-btn"
          aria-label="Ouvrir le sac à dos"
          @click="bagOpen = true"
        >
          <UIcon
            name="i-lucide-backpack"
            class="size-5"
          />
          <span class="bag-btn__lbl">Sac</span>
          <span
            v-if="bagCount"
            class="bag-btn__badge tabular"
          >{{ bagCount }}</span>
        </button>
        <CoinBalance />
      </div>
    </div>

    <!-- Scène -->
    <div class="play__stage">
      <Transition
        name="phase"
        mode="out-in"
      >
        <!-- IDLE : carrousel + ouverture -->
        <section
          v-if="phase === 'idle'"
          key="idle"
          class="idle"
        >
          <div class="idle__intro">
            <h1 class="idle__title font-display">
              Ouvre un booster
            </h1>
            <p class="idle__lead">
              Choisis ta région, ouvre le paquet — une carte t'attend derrière le tourbillon.
            </p>
          </div>

          <!-- Ticket actif : remplace le sélecteur de biome (prochain tirage filtré) -->
          <div
            v-if="hasActiveTicket"
            class="ticket-slot"
          >
            <span class="ticket-slot__ico">
              <UIcon
                name="i-lucide-ticket"
                class="size-6"
              />
            </span>
            <div class="ticket-slot__info">
              <span class="ticket-slot__label font-display">Ticket {{ activeTicketLabel }} actif</span>
              <span class="ticket-slot__sub">Ton prochain tirage sera filtré · coût normal</span>
            </div>
            <PButton
              color="neutral"
              size="sm"
              :loading="deactivating"
              @click="deactivateActiveTicket"
            >
              Désactiver
            </PButton>
          </div>

          <div
            v-else
            class="carousel"
            role="radiogroup"
            aria-label="Choix du booster par région"
          >
            <button
              v-for="b in boosters"
              :key="b.biome || 'all'"
              type="button"
              class="carousel__item"
              :class="{ 'carousel__item--on': selected === b.biome }"
              role="radio"
              :aria-checked="selected === b.biome"
              @click="selectBooster(b.biome)"
            >
              <BoosterPack
                :biome="b.biome"
                :cost="b.cost"
                :owned="b.owned"
                :total="b.total"
                size="md"
              />
            </button>
          </div>

          <!-- Charme Chroma actif : tirages boostés restants -->
          <p
            v-if="charmeRolls > 0"
            class="idle__charme"
          >
            <UIcon
              name="i-lucide-sparkles"
              class="size-4"
            />
            Charme Chroma actif · <b>{{ charmeRolls }}</b> tirage{{ charmeRolls > 1 ? 's' : '' }} boosté{{ charmeRolls > 1 ? 's' : '' }} · shiny ×2
          </p>

          <div class="idle__cta">
            <div class="idle__btns">
              <PButton
                :disabled="!affordable"
                @click="open"
              >
                <UIcon
                  name="i-lucide-sparkles"
                  class="size-5"
                />
                Ouvrir — <span class="coin" />{{ currentCost }}
              </PButton>
              <PButton
                v-if="!hasActiveTicket"
                color="neutral"
                :disabled="!affordableBatch"
                :title="!affordableBatch ? 'Solde insuffisant pour 5 paquets' : 'Ouvre 5 paquets d\'un coup'"
                @click="open5"
              >
                <UIcon
                  name="i-lucide-layers"
                  class="size-5"
                />
                Ouvrir ×5 — <span class="coin" />{{ batchCost }}
              </PButton>
            </div>
            <p class="idle__solde">
              <span
                v-if="balance !== null"
                class="tabular"
              >Solde&nbsp;: <b>{{ balance }}</b> pièces</span>
              <span
                v-if="!affordable"
                class="idle__short"
              >· il te manque {{ shortfall }}</span>
            </p>
            <p
              v-if="errorMsg"
              class="idle__err"
            >
              {{ errorMsg }}
            </p>
          </div>
        </section>

        <!-- OPENING : tourbillon -->
        <section
          v-else-if="phase === 'opening'"
          key="opening"
          class="opening"
        >
          <OrbitSwirl :tint="currentTint" />
          <p class="opening__hint font-display">
            Les cartes tourbillonnent…
          </p>
        </section>

        <!-- REVEAL : révélation -->
        <section
          v-else
          key="reveal"
          class="reveal-wrap"
        >
          <BoosterRevealBatch
            v-if="batchTiles"
            :tiles="batchTiles"
            :count="batchCount"
            @pick="pickBatchChoice"
            @finish="finish"
          />
          <BoosterReveal
            v-else-if="revealView"
            :view="revealView"
            @pick="pickChoice"
            @finish="finish"
          />
          <p
            v-if="errorMsg"
            class="idle__err"
          >
            {{ errorMsg }}
          </p>
        </section>
      </Transition>
    </div>

    <!-- Hub : quotas du jour / de la semaine (masqué pendant l'ouverture) -->
    <HubPanel v-if="phase === 'idle'" />

    <BagModal v-model:open="bagOpen" />
  </div>
</template>

<style scoped>
.play { display: flex; flex-direction: column; gap: 20px; }
.play__bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.play__who { display: flex; align-items: center; gap: 8px; }
.play__actions { display: flex; align-items: center; gap: 10px; }

/* Bouton Sac à dos (ouvre l'inventaire) */
.bag-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 999px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .84rem;
  color: var(--ui-text-toned);
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  transition: color .15s ease, background .15s ease, transform .15s var(--ease-pop);
}
.bag-btn:hover { color: var(--color-poke-600); background: var(--color-poke-50); transform: translateY(-1px); }
.bag-btn:focus-visible { outline: 2px solid var(--color-poke-400); outline-offset: 2px; }
.bag-btn__lbl { display: none; }
@media (min-width: 480px) { .bag-btn__lbl { display: inline; } }
.bag-btn__badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  font-size: .68rem;
  font-weight: 800;
  color: #fff;
  background: var(--color-poke-500);
}

.play__stage {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr); /* piste = largeur du conteneur, pas max-content */
  align-items: center;
  min-height: 62vh;
  overflow-x: clip; /* borne le tourbillon sans rogner verticalement */
  padding: 8px 0;
}

/* ── IDLE ── */
.idle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  width: 100%;
}
.idle__intro { text-align: center; display: flex; flex-direction: column; gap: 6px; max-width: 34rem; }
.idle__title { font-weight: 700; font-size: clamp(1.6rem, 5vw, 2rem); }
.idle__lead { font-weight: 600; font-size: 0.9rem; color: var(--ui-text-muted); }

/* Slot ticket actif (remplace le carrousel) */
.ticket-slot {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  max-width: 30rem;
  margin: 12px 0;
  padding: 14px 16px;
  border-radius: 18px;
  background: color-mix(in oklab, var(--color-poke-500) 8%, var(--ui-bg-elevated));
  border: 1px dashed color-mix(in oklab, var(--color-poke-500) 45%, transparent);
}
.ticket-slot__ico {
  flex: none;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  color: #fff;
  background: linear-gradient(150deg, #ee5a48, var(--color-poke-500));
  box-shadow: 0 3px 0 var(--color-poke-700);
}
.ticket-slot__info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.ticket-slot__label { font-weight: 700; font-size: 1rem; color: var(--ui-text-highlighted); }
.ticket-slot__sub { font-size: .82rem; color: var(--ui-text-muted); }

/* Bandeau Charme Chroma actif */
.idle__charme {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-weight: 700;
  font-size: .84rem;
  color: #8b5cc4;
  background: color-mix(in oklab, #c9b3ff 20%, transparent);
  padding: 7px 14px;
  border-radius: 999px;
}
.idle__charme :deep(svg) { color: #a06cc4; }
.idle__charme b { color: #7a49a8; }

.carousel {
  display: flex;
  gap: 16px;
  width: 100%;
  max-width: 100%;
  /* Marge suffisante : l'item sélectionné grossit (scale 1.06) + anneau ;
     overflow-x:auto force overflow-y:auto, donc on évite tout rognage. */
  padding: 34px 30px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: 30px;
  scrollbar-width: thin;
  justify-content: safe center;
}
.carousel__item {
  flex: none;
  scroll-snap-align: center;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  border-radius: 24px;
  transition: transform .24s var(--ease-pop), filter .24s ease;
  filter: saturate(.86) opacity(.72);
  transform: scale(.9);
}
.carousel__item:hover { filter: saturate(1) opacity(1); transform: scale(.95); }
.carousel__item--on {
  filter: none;
  transform: scale(1.06);
}
.carousel__item--on :deep(.pack__body) {
  outline: 3px solid color-mix(in oklab, var(--color-poke-500) 65%, white);
  outline-offset: 5px;
}
.carousel__item:focus-visible {
  outline: 3px solid var(--color-poke-400);
  outline-offset: 4px;
}

.idle__cta { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.idle__btns { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.coin {
  display: inline-block;
  width: 15px;
  height: 15px;
  margin: 0 2px 0 4px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff, #f6c453 62%, #e0a92e);
  box-shadow: 0 0 6px rgba(246, 196, 83, .8);
  vertical-align: -2px;
}
.idle__solde { font-weight: 700; font-size: 0.85rem; color: var(--ui-text-muted); }
.idle__solde b { color: var(--ui-text-highlighted); }
.idle__short { color: var(--color-poke-600); margin-left: 4px; }
.idle__err { font-size: 0.85rem; color: var(--color-poke-600); text-align: center; }

/* ── OPENING ── */
.opening { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 100%; }
.opening__hint { font-weight: 700; font-size: 1.15rem; color: var(--color-poke-600); }
.opening__hint { animation: wobble .6s ease-in-out infinite; }

/* ── REVEAL ── */
.reveal-wrap { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 10px; }

/* Transition entre les temps de la scène */
.phase-enter-active { transition: opacity .3s var(--ease-glide), transform .3s var(--ease-pop); }
.phase-leave-active { transition: opacity .18s ease, transform .18s ease; }
.phase-enter-from { opacity: 0; transform: translateY(14px) scale(.98); }
.phase-leave-to { opacity: 0; transform: scale(.98); }

@keyframes wobble {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}
@media (prefers-reduced-motion: reduce) {
  .opening__hint { animation: none; }
  .phase-enter-active, .phase-leave-active { transition: opacity .12s ease; }
  .phase-enter-from, .phase-leave-to { transform: none; }
}
</style>
