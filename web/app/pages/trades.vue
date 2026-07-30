<script setup lang="ts">
import type { DomainTrade, TradePlayer, TradeCard, RealRarity } from '~/types/domain'
import { useTradesStore } from '~/stores/trades'

// Page Échanges — éligibilité (≥120 standards uniques, 1/semaine, cooldown par
// partenaire), flux create → respond → confirm, sections à traiter / en attente
// / historique, grille de partenaires.
const trades = useTradesStore()
const collection = useCollectionStore()
const auth = useAuthStore()
const toast = useToast()

const { pending: busy, run: guard } = useAsyncAction()

const me = computed(() => auth.userId)
const elig = computed(() => trades.eligibility)
const canBrowse = computed(() => !!elig.value && elig.value.uniqueStandardCount >= elig.value.minRequired)
const canTrade = computed(() => !!elig.value?.eligible)

const eligReason = computed(() => {
  const e = elig.value
  if (!e || e.eligible) return ''
  if (e.uniqueStandardCount < e.minRequired) return `Il te faut ${e.minRequired} cartes standards uniques pour échanger (tu en as ${e.uniqueStandardCount}).`
  if (e.tradedThisWeek) return 'Tu as déjà conclu un échange cette semaine (remise à zéro lundi).'
  return 'Échanges indisponibles pour le moment.'
})

function cooldownLabel(p: TradePlayer): string {
  if (!p.cooldownUntil) return ''
  const days = Math.ceil((new Date(p.cooldownUntil).getTime() - Date.now()) / 86_400_000)
  return days > 0 ? `Dispo dans ${days} j` : ''
}
function isOnCooldown(p: TradePlayer): boolean {
  return !!p.cooldownUntil && new Date(p.cooldownUntil).getTime() > Date.now()
}

// ─── Création ─────────────────────────────────────────────────────────────────
const createTarget = ref<TradePlayer | null>(null)
const createOpen = ref(false)
const createRarities: RealRarity[] = ['Commun', 'Rare', 'Épique']

function startCreate(player: TradePlayer) {
  if (!canTrade.value) {
    toast.add({ title: eligReason.value || 'Échange indisponible.', color: 'error' })
    return
  }
  createTarget.value = player
  createOpen.value = true
}
const createLoad = (r: RealRarity) => (createTarget.value ? trades.playerCards(createTarget.value.id, r) : Promise.resolve([]))
function onCreatePick(card: TradeCard) {
  const target = createTarget.value
  if (!target) return
  return guard(async () => {
    await trades.create(target.id, card.id)
    toast.add({ title: 'Demande d\'échange envoyée !', color: 'success', icon: 'i-lucide-send' })
    createOpen.value = false
  })
}

// ─── Réponse (la cible propose une carte du même palier) ──────────────────────
const respondTrade = ref<DomainTrade | null>(null)
const respondOpen = ref(false)
const respondRarities = computed<RealRarity[]>(() => (respondTrade.value ? [respondTrade.value.requested.rarity] : ['Commun']))
const respondLoad = (r: RealRarity): Promise<TradeCard[]> => Promise.resolve(
  collection.cards
    .filter(c => c.owned && !c.isShiny && c.rarity === r && c.quantity >= 2)
    .map(c => ({ id: c.id, name: c.name, imageUrl: c.imageUrl, rarity: c.rarity, quantity: c.quantity, viewerOwns: true }))
)

function startRespond(trade: DomainTrade) {
  respondTrade.value = trade
  respondOpen.value = true
}
function onRespondPick(card: TradeCard) {
  const trade = respondTrade.value
  if (!trade) return
  return guard(async () => {
    await trades.respond(trade.id, true, card.id)
    toast.add({ title: 'Contre-offre envoyée !', color: 'success' })
    respondOpen.value = false
  })
}

// ─── Actions simples ──────────────────────────────────────────────────────────
function run(fn: () => Promise<unknown>, okMsg: string) {
  return guard(async () => {
    await fn()
    toast.add({ title: okMsg, color: 'success' })
  })
}
const decline = (t: DomainTrade) => run(() => trades.respond(t.id, false), 'Échange refusé')
const confirmTrade = (t: DomainTrade) => run(() => trades.confirm(t.id, true), 'Échange conclu ! 🎉')
const rejectTrade = (t: DomainTrade) => run(() => trades.confirm(t.id, false), 'Échange refusé')
const cancelTrade = (t: DomainTrade) => run(() => trades.cancel(t.id), 'Échange annulé')

const { loading, errorMsg, retry } = usePageData(async () => {
  await trades.ensureFresh()
  collection.ensureFresh().catch(() => {})
  if (canBrowse.value) trades.loadPlayers()
})
</script>

<template>
  <div class="tr">
    <header class="tr__head">
      <div>
        <h1 class="tr__title font-display">
          Échanges
        </h1>
        <p class="tr__lead">
          Troque tes doublons standards avec d'autres dresseurs — même rareté des deux côtés.
        </p>
      </div>
    </header>

    <div
      v-if="loading"
      class="tr__load"
    >
      <USkeleton class="h-20 w-full rounded-2xl" />
      <USkeleton class="h-32 w-full rounded-2xl" />
    </div>

    <PageError
      v-else-if="errorMsg"
      :message="errorMsg"
      :pending="loading"
      @retry="retry"
    />

    <template v-else>
      <!-- Éligibilité -->
      <PPanel
        class="elig"
        :class="{ 'elig--ok': canTrade }"
      >
        <div class="elig__row">
          <UIcon
            :name="canTrade ? 'i-lucide-badge-check' : 'i-lucide-info'"
            class="size-6"
          />
          <div class="elig__body">
            <p class="elig__title">
              {{ canTrade ? 'Tu peux échanger cette semaine' : 'Échanges verrouillés' }}
            </p>
            <p
              v-if="!canTrade"
              class="elig__reason"
            >
              {{ eligReason }}
            </p>
          </div>
        </div>
        <div
          v-if="elig"
          class="elig__gauge"
        >
          <div class="elig__bar">
            <i :style="{ width: Math.min(100, (elig.uniqueStandardCount / elig.minRequired) * 100) + '%' }" />
          </div>
          <span class="elig__count tabular">{{ elig.uniqueStandardCount }}/{{ elig.minRequired }} standards uniques</span>
        </div>
      </PPanel>

      <!-- À traiter -->
      <section
        v-if="trades.toHandle.length"
        class="block"
      >
        <h2 class="block__title font-display">
          À traiter <span class="block__badge">{{ trades.toHandle.length }}</span>
        </h2>
        <div class="list">
          <TradeRow
            v-for="t in trades.toHandle"
            :key="t.id"
            :trade="t"
            :me="me"
            :busy="busy"
            @accept="startRespond(t)"
            @decline="decline(t)"
            @confirm="confirmTrade(t)"
            @reject="rejectTrade(t)"
            @cancel="cancelTrade(t)"
          />
        </div>
      </section>

      <!-- En attente -->
      <section
        v-if="trades.waiting.length"
        class="block"
      >
        <h2 class="block__title font-display">
          En attente
        </h2>
        <div class="list">
          <TradeRow
            v-for="t in trades.waiting"
            :key="t.id"
            :trade="t"
            :me="me"
            :busy="busy"
            @cancel="cancelTrade(t)"
          />
        </div>
      </section>

      <!-- Partenaires -->
      <section
        v-if="canBrowse"
        class="block"
      >
        <h2 class="block__title font-display">
          Partenaires disponibles
        </h2>
        <p
          v-if="!canTrade"
          class="block__hint"
        >
          {{ eligReason }}
        </p>
        <div
          v-if="trades.players.length"
          class="players"
        >
          <div
            v-for="p in trades.players"
            :key="p.id"
            class="player"
          >
            <TourneyAvatar
              :src="p.avatarUrl"
              :shiny="p.avatarIsShiny"
              :size="44"
              :alt="p.username"
            />
            <span class="player__name">{{ p.username }}</span>
            <span
              v-if="isOnCooldown(p)"
              class="player__cd"
            >{{ cooldownLabel(p) }}</span>
            <PButton
              v-else
              color="neutral"
              :disabled="!canTrade || busy"
              @click="startCreate(p)"
            >
              <UIcon
                name="i-lucide-arrow-left-right"
                class="size-4"
              /> Proposer
            </PButton>
          </div>
        </div>
        <p
          v-else
          class="block__hint"
        >
          Aucun partenaire disponible pour l'instant.
        </p>
      </section>

      <!-- Historique -->
      <details
        v-if="trades.history.length"
        class="hist"
      >
        <summary>Historique ({{ trades.history.length }})</summary>
        <div class="list">
          <TradeRow
            v-for="t in trades.history"
            :key="t.id"
            :trade="t"
            :me="me"
          />
        </div>
      </details>
    </template>

    <!-- Sélecteur : carte demandée (chez le partenaire) -->
    <CardPicker
      v-model:open="createOpen"
      :title="`Demander une carte à ${createTarget?.username ?? ''}`"
      subtitle="Choisis la carte que tu veux obtenir. Tu proposeras une carte de même rareté en retour."
      :rarities="createRarities"
      :load="createLoad"
      :busy="busy"
      @pick="onCreatePick"
    />

    <!-- Sélecteur : ma carte proposée en retour -->
    <CardPicker
      v-model:open="respondOpen"
      :title="`Proposer une carte en retour de ${respondTrade?.requested.name ?? ''}`"
      subtitle="Choisis une de tes cartes (même rareté, au moins 2 exemplaires)."
      :rarities="respondRarities"
      :load="respondLoad"
      :busy="busy"
      @pick="onRespondPick"
    />
  </div>
</template>

<style scoped>
.tr { display: flex; flex-direction: column; gap: 16px; }
.tr__title { font-weight: 700; font-size: 1.7rem; margin: 0; }
.tr__lead { font-weight: 600; font-size: .9rem; color: var(--ui-text-muted); margin: 4px 0 0; max-width: 42rem; }
.tr__load { display: flex; flex-direction: column; gap: 12px; }

.elig { display: flex; flex-direction: column; gap: 12px; }
.elig--ok { border-color: color-mix(in oklab, #5bbf82 40%, transparent); }
.elig__row { display: flex; align-items: flex-start; gap: 12px; }
.elig__row :deep(svg) { color: var(--ui-text-muted); flex: none; margin-top: 2px; }
.elig--ok .elig__row :deep(svg) { color: #3f9e66; }
.elig__title { font-family: var(--font-display); font-weight: 700; font-size: 1rem; color: var(--ui-text-highlighted); }
.elig__reason { font-size: .85rem; color: var(--ui-text-muted); margin-top: 2px; }
.elig__gauge { display: flex; align-items: center; gap: 12px; }
.elig__bar { flex: 1; height: 9px; border-radius: 99px; background: var(--ui-bg-accented); overflow: hidden; }
.elig__bar > i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #8fd6a8, #5bbf82); transition: width .6s var(--ease-glide); }
.elig__count { font-size: .8rem; font-weight: 700; color: var(--ui-text-muted); flex: none; }

.block { display: flex; flex-direction: column; gap: 12px; }
.block__title { font-weight: 700; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; }
.block__badge {
  font-size: .74rem;
  font-weight: 800;
  color: #fff;
  background: var(--color-poke-500);
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
}
.block__hint { font-size: .84rem; color: var(--ui-text-dimmed); }
.list { display: flex; flex-direction: column; gap: 10px; }

.players { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
.player {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 14px 12px;
  border-radius: 16px;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  text-align: center;
}
.player__name { font-family: var(--font-display); font-weight: 700; font-size: .86rem; color: var(--ui-text-highlighted); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.player__cd { font-size: .72rem; font-weight: 700; color: var(--ui-text-dimmed); background: var(--ui-bg-muted); padding: 5px 10px; border-radius: 999px; }

.hist { border-radius: 14px; }
.hist > summary {
  cursor: pointer;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .95rem;
  color: var(--ui-text-muted);
  padding: 8px 2px;
}
.hist > summary:hover { color: var(--ui-text); }
.hist .list { margin-top: 10px; }
</style>
