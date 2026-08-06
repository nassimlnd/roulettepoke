<script setup lang="ts">
import type { DomainOwnedCard } from '~/types/domain'
import { SELL_PRICE } from '~/utils/poke'
import { SHINY_PITY_DENOMINATOR, MERGE_COST } from '~/constants/game'
import { GENERATIONS } from '~/constants/generation'

const collection = useCollectionStore()
const toast = useToast()

const TABS = [
  { value: 'standard', label: 'Standard' },
  { value: 'shiny', label: '✦ Shiny' }
] as const

const OWNERSHIP = [
  { value: 'all', label: 'Toutes' },
  { value: 'owned', label: 'Obtenues' },
  { value: 'missing', label: 'Manquantes' }
] as const

// La région est un axe de premier plan (502 cartes réparties sur deux Pokédex),
// pas un critère parmi quatre : elle mérite un segment visible plutôt qu'un
// menu déroulant de plus. Construit depuis GENERATIONS pour suivre l'ajout
// d'une future région sans retoucher la page.
const REGIONS = [
  { value: 'all', label: 'Toutes' },
  ...GENERATIONS.map(g => ({ value: String(g.id), label: g.region }))
] as const

const tab = ref<'standard' | 'shiny'>('standard')
const sortByPity = ref(false)

// ─── Filtres ──────────────────────────────────────────────────────────────────
// Sentinelle 'all' = aucun filtre. Elle ne peut PAS être la chaîne vide :
// USelectMenu (Combobox) refuse un item de valeur vide — celle-ci est réservée
// à « pas de sélection », et un tel item casse silencieusement toute la liste.
const ALL = 'all'
const fType = ref<string>(ALL)
const fRarity = ref<string>(ALL)
const fBiome = ref<string>(ALL)
const fOwned = ref<'all' | 'owned' | 'missing'>('all')

const { loading, errorMsg, retry } = usePageData(() => collection.ensureFresh())

// La région n'est pas un filtre mais une PORTÉE, au même titre que l'onglet :
// le jeu compte deux Pokédex distincts (151 à Kanto, 100 à Johto) et c'est leur
// complétion séparée qui débloque le bonus shiny permanent. Elle entre donc
// dans le décompte de progression, là où type/rareté/biome n'y touchent pas.
const fRegion = ref<string>('all')

// Cartes de la portée courante, AVANT filtres : sert de base à la progression
// (« 40/151 obtenues » doit rester la progression réelle, pas celle du filtre).
const tabCards = computed(() =>
  collection.cards.filter(c =>
    (tab.value === 'shiny' ? c.isShiny : !c.isShiny)
    && (fRegion.value === 'all' || String(c.generation) === fRegion.value)))

// Options dérivées des données réelles (et non d'une liste codée en dur) : ce
// qui est proposé existe forcément dans la collection.
function optionsOf(pick: (c: DomainOwnedCard) => string, label: string) {
  const values = [...new Set(tabCards.value.map(pick))].sort((a, b) => a.localeCompare(b, 'fr'))
  return [{ value: ALL, label }, ...values.map(v => ({ value: v, label: v }))]
}
const typeItems = computed(() => optionsOf(c => c.type, 'Tous les types'))
const rarityItems = computed(() => optionsOf(c => c.rarity, 'Toutes raretés'))
const biomeItems = computed(() => optionsOf(c => c.biome, 'Tous les biomes'))

const filtersActive = computed(() =>
  fType.value !== ALL || fRarity.value !== ALL || fBiome.value !== ALL || fOwned.value !== 'all')

function resetFilters() {
  fType.value = ALL
  fRarity.value = ALL
  fBiome.value = ALL
  fOwned.value = 'all'
}

const cards = computed(() => {
  const list = tabCards.value.filter(c =>
    (fType.value === ALL || c.type === fType.value)
    && (fRarity.value === ALL || c.rarity === fRarity.value)
    && (fBiome.value === ALL || c.biome === fBiome.value)
    && (fOwned.value === 'all' || (fOwned.value === 'owned' ? c.owned : !c.owned)))
  if (sortByPity.value) {
    // Tri par chance shiny estimée décroissante (les plus proches d'un shiny).
    return [...list].sort((a, b) => (b.quantity) - (a.quantity))
  }
  return [...list].sort((a, b) => a.num - b.num)
})

// Nommer la région dans le décompte : « 40 / 151 » seul ne dit pas de quel
// Pokédex on parle quand il y en a deux.
const scopeLabel = computed(() => {
  const r = REGIONS.find(x => x.value === fRegion.value)
  return r && r.value !== 'all' ? ` à ${r.label}` : ''
})

const ownedCount = computed(() => tabCards.value.filter(c => c.owned).length)
const total = computed(() => tabCards.value.length)
const progress = computed(() => (total.value ? Math.round((ownedCount.value / total.value) * 100) : 0))

// ─── Détail / actions ─────────────────────────────────────────────────────────
const selected = ref<DomainOwnedCard | null>(null)
const detailOpen = ref(false)
const sellOpen = ref(false)
const mergeOpen = ref(false)
const { pending: actionLoading, run } = useAsyncAction()

function openDetail(card: DomainOwnedCard) {
  if (!card.owned) return
  selected.value = card
  detailOpen.value = true
}

function shinyChance(card: DomainOwnedCard): string {
  return `~${Math.round(((card.quantity + 1) / SHINY_PITY_DENOMINATOR) * 1000) / 10}%`
}

function canMerge(card: DomainOwnedCard): boolean {
  return collection.mergeables.some(m => m.id === card.id)
}

const sellPrice = computed(() => {
  if (!selected.value) return 0
  return selected.value.isShiny ? 0 : SELL_PRICE[selected.value.rarity]
})

function confirmSell() {
  if (!selected.value) return
  return run(async () => {
    const res = await collection.sell(selected.value!.id)
    toast.add({
      title: res.charmeObtained ? 'Charme Chroma obtenu !' : `+${res.sellPrice} coins`,
      color: 'success',
      icon: res.charmeObtained ? 'i-lucide-sparkles' : 'i-lucide-coins'
    })
    sellOpen.value = false
    detailOpen.value = false
    await collection.ensureFresh(true)
  })
}

function confirmMerge() {
  if (!selected.value) return
  return run(async () => {
    const parent = selected.value!.parentCardId ?? selected.value!.id
    const card = await collection.merge(parent, selected.value!.level)
    toast.add({ title: `Fusion réussie : ${card.name} !`, color: 'success', icon: 'i-lucide-arrow-up-circle' })
    mergeOpen.value = false
    detailOpen.value = false
  })
}
</script>

<template>
  <div class="col">
    <!-- En-tête + progression -->
    <header class="col__head">
      <div>
        <h1 class="col__title">
          Ma collection
        </h1>
        <div class="col__progress">
          <span class="tabular">{{ ownedCount }} / {{ total }} obtenues{{ scopeLabel }}</span>
          <div class="bar">
            <i :style="{ width: progress + '%' }" />
          </div>
          <span class="tabular col__pct">{{ progress }} %</span>
        </div>
      </div>
      <CoinBalance />
    </header>

    <!-- Onglets + tri -->
    <div class="col__controls">
      <PSegmented
        v-model="tab"
        :options="TABS"
        aria-label="Filtrer la collection"
      />
      <PSegmented
        v-model="fRegion"
        :options="REGIONS"
        size="sm"
        a11y="radio"
        aria-label="Filtrer par région"
      />
      <button
        class="toggle"
        :class="{ 'toggle--on': sortByPity }"
        :aria-pressed="sortByPity"
        @click="sortByPity = !sortByPity"
      >
        <UIcon
          name="i-lucide-sparkles"
          class="size-4"
        />
        Chance shiny
      </button>
    </div>

    <!-- Filtres cumulables (type / rareté / biome / possession) -->
    <div class="filters">
      <USelectMenu
        v-model="fType"
        :items="typeItems"
        value-key="value"
        icon="i-lucide-shapes"
        aria-label="Filtrer par type"
        class="filters__menu"
      />
      <USelectMenu
        v-model="fRarity"
        :items="rarityItems"
        value-key="value"
        icon="i-lucide-gem"
        aria-label="Filtrer par rareté"
        class="filters__menu"
      />
      <USelectMenu
        v-model="fBiome"
        :items="biomeItems"
        value-key="value"
        icon="i-lucide-map"
        aria-label="Filtrer par biome"
        class="filters__menu"
      />
      <PSegmented
        v-model="fOwned"
        :options="OWNERSHIP"
        size="sm"
        a11y="radio"
        aria-label="Filtrer par possession"
      />
      <button
        v-if="filtersActive"
        class="filters__reset"
        @click="resetFilters"
      >
        <UIcon
          name="i-lucide-x"
          class="size-4"
        />
        Réinitialiser
      </button>
      <span
        v-if="filtersActive"
        class="filters__count tabular"
      >{{ cards.length }} carte{{ cards.length > 1 ? 's' : '' }}</span>
    </div>

    <PageError
      v-if="errorMsg"
      :message="errorMsg"
      :pending="loading"
      @retry="retry"
    />

    <!-- Grille (classeur) -->
    <div
      v-if="loading"
      class="grid"
    >
      <USkeleton
        v-for="i in 18"
        :key="i"
        class="aspect-[63/88] w-[132px] rounded-2xl"
      />
    </div>
    <!-- Aucun résultat : la combinaison de filtres ne correspond à rien -->
    <PPanel
      v-else-if="!cards.length"
      class="empty"
    >
      <UIcon
        name="i-lucide-search-x"
        class="size-8"
      />
      <p class="empty__title font-display">
        Aucune carte ne correspond
      </p>
      <p class="empty__sub">
        Essaie d'assouplir un filtre.
      </p>
      <PButton
        color="neutral"
        @click="resetFilters"
      >
        Réinitialiser les filtres
      </PButton>
    </PPanel>
    <div
      v-else
      class="grid"
    >
      <button
        v-for="card in cards"
        :key="card.id"
        class="cell"
        :disabled="!card.owned"
        @click="openDetail(card)"
      >
        <!-- `freeze` : les sprites du backend sont des WebP animés ; on les fige
             dans la grille (150+ cartes) et ils s'animent dans la modale. -->
        <HoloCard
          :card="card"
          size="sm"
          :quantity="card.quantity"
          :ambient="false"
          freeze
        />
        <!-- Fusion disponible : signalée DANS la grille. Le bouton ne vivait que
             dans la modale de détail, donc la seule boucle qui recycle les
             doublons ne se découvrait qu'en ouvrant les cartes une par une. -->
        <span
          v-if="canMerge(card)"
          class="mergeable"
          :title="`Fusion possible : ${MERGE_COST} exemplaires disponibles`"
        >
          <UIcon
            name="i-lucide-arrow-up-circle"
            class="size-3.5"
          />
          Fusion
        </span>
        <span
          v-if="sortByPity && card.owned && !card.isShiny"
          class="pity"
        >✦ {{ shinyChance(card) }}</span>
      </button>
    </div>

    <!-- Détail de carte -->
    <UModal
      v-model:open="detailOpen"
      :title="selected?.name"
    >
      <template #body>
        <div
          v-if="selected"
          class="detail"
        >
          <!-- Pas de `freeze` ici : le sprite s'anime au clic. -->
          <HoloCard
            :card="selected"
            size="lg"
            :quantity="selected.quantity"
          />
          <div class="detail__info">
            <RarityBadge
              :rarity="selected.rarity"
              :shiny="selected.isShiny"
            />
            <p class="detail__sub">
              {{ selected.quantity }} exemplaire{{ selected.quantity > 1 ? 's' : '' }}
              <template v-if="!selected.isShiny">
                · chance shiny estimée {{ shinyChance(selected) }}
              </template>
            </p>
          </div>
          <div class="detail__actions">
            <PButton
              v-if="canMerge(selected)"
              icon="i-lucide-arrow-up-circle"
              @click="mergeOpen = true"
            >
              Fusionner
            </PButton>
            <PButton
              color="neutral"
              icon="i-lucide-coins"
              @click="sellOpen = true"
            >
              {{ selected.isShiny ? 'Vendre (Charme)' : `Vendre (${sellPrice} 🪙)` }}
            </PButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Confirmation vente -->
    <ConfirmDialog
      v-model:open="sellOpen"
      title="Vendre cette carte ?"
      :message="selected?.isShiny
        ? `Vendre ${selected?.name} te donnera un Charme Chroma.`
        : `Vendre ${selected?.name} te rapportera ${sellPrice} coins.`"
      confirm-label="Vendre"
      danger
      :loading="actionLoading"
      @confirm="confirmSell"
    />

    <!-- Confirmation fusion (résout C5 : plus de fusion sans confirmation) -->
    <ConfirmDialog
      v-model:open="mergeOpen"
      title="Fusionner cette carte ?"
      :message="`Cette fusion consomme ${MERGE_COST} exemplaires de ${selected?.name} pour obtenir son évolution. Cette action est définitive.`"
      confirm-label="Fusionner"
      danger
      :loading="actionLoading"
      @confirm="confirmMerge"
    />
  </div>
</template>

<style scoped>
.col { display: flex; flex-direction: column; gap: 18px; }
.col__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.col__title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.7rem;
  margin: 0;
}
.col__progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  color: var(--ui-text-muted);
  font-size: .9rem;
}
.col__progress .bar {
  width: 130px;
  height: 9px;
  border-radius: 99px;
  background: var(--ui-bg-accented);
  overflow: hidden;
}
.col__progress .bar > i {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #ffd67f, var(--color-poke-500));
  transition: width .6s var(--ease-glide);
}
.col__pct { color: var(--ui-text); font-weight: 700; }

.col__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
/* Bascule autonome « Chance shiny » (hors segmented control). */
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: .9rem;
  padding: 7px 16px;
  border-radius: 10px;
  cursor: pointer;
  color: var(--ui-text-muted);
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  transition: all .15s ease;
}
.toggle:not(.toggle--on):hover { color: var(--ui-text); }
.toggle--on {
  background: var(--color-poke-500);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 3px 0 var(--color-poke-700);
}

.filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.filters__menu { min-width: 148px; }
.filters__reset {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: .84rem;
  font-weight: 600;
  color: var(--ui-text-muted);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: color .15s ease, background .15s ease;
}
.filters__reset:hover {
  color: var(--ui-text);
  background: var(--ui-bg-muted);
}
.filters__count {
  font-size: .84rem;
  color: var(--ui-text-dimmed);
  margin-left: auto;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 34px 18px;
  text-align: center;
  color: var(--ui-text-muted);
}
.empty__title { font-weight: 700; font-size: 1.05rem; color: var(--ui-text-highlighted); }
.empty__sub { font-size: .88rem; margin-bottom: 6px; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 132px);
  justify-content: center;
  gap: 14px;
}
.cell {
  position: relative;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  border-radius: 12px;
  /* La grille peut afficher 150+ cartes : on saute le rendu/peinture des
     cellules hors écran (taille réservée pour éviter les sauts de scroll). */
  content-visibility: auto;
  contain-intrinsic-size: 132px 184px;
}
.cell:disabled { cursor: default; }
.cell:focus-visible {
  outline: 2px solid var(--color-poke-400);
  outline-offset: 3px;
}
.mergeable {
  position: absolute;
  top: 6px;
  left: 6px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: .58rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .03em;
  color: #fff;
  background: #8f6fd0;
  border-radius: 6px;
  padding: 2px 5px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .28);
}

.pity {
  position: absolute;
  inset-inline: 7px;
  bottom: 7px;
  text-align: center;
  font-size: .6rem;
  font-weight: 800;
  color: #fff;
  background: rgba(0, 0, 0, .58);
  border-radius: 6px;
  padding: 2px;
}

.detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.detail__info { text-align: center; }
.detail__sub {
  color: var(--ui-text-muted);
  font-size: .88rem;
  margin: 6px 0 0;
}
.detail__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}
</style>
