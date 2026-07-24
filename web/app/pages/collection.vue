<script setup lang="ts">
import type { DomainOwnedCard } from '~/types/domain'
import { SELL_PRICE } from '~/utils/poke'
import { SHINY_PITY_DENOMINATOR, MERGE_COST } from '~/constants/game'

const collection = useCollectionStore()
const toast = useToast()

const tab = ref<'standard' | 'shiny'>('standard')
const sortByPity = ref(false)
const loading = ref(true)
const errorMsg = ref('')

onMounted(async () => {
  try {
    await collection.ensureFresh()
  } catch (err) {
    errorMsg.value = humanizeError(err)
  } finally {
    loading.value = false
  }
})

const cards = computed(() => {
  const list = collection.cards.filter(c => (tab.value === 'shiny' ? c.isShiny : !c.isShiny))
  if (sortByPity.value) {
    // Tri par chance shiny estimée décroissante (les plus proches d'un shiny).
    return [...list].sort((a, b) => (b.quantity) - (a.quantity))
  }
  return [...list].sort((a, b) => a.num - b.num)
})

const ownedCount = computed(() => cards.value.filter(c => c.owned).length)
const total = computed(() => cards.value.length)
const progress = computed(() => (total.value ? Math.round((ownedCount.value / total.value) * 100) : 0))

// ─── Détail / actions ─────────────────────────────────────────────────────────
const selected = ref<DomainOwnedCard | null>(null)
const detailOpen = ref(false)
const sellOpen = ref(false)
const mergeOpen = ref(false)
const actionLoading = ref(false)

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

async function confirmSell() {
  if (!selected.value) return
  actionLoading.value = true
  try {
    const res = await collection.sell(selected.value.id)
    toast.add({
      title: res.charmeObtained ? 'Charme Chroma obtenu !' : `+${res.sellPrice} coins`,
      color: 'success',
      icon: res.charmeObtained ? 'i-lucide-sparkles' : 'i-lucide-coins'
    })
    sellOpen.value = false
    detailOpen.value = false
    await collection.ensureFresh(true)
  } catch (err) {
    toast.add({ title: humanizeError(err), color: 'error' })
  } finally {
    actionLoading.value = false
  }
}

async function confirmMerge() {
  if (!selected.value) return
  actionLoading.value = true
  try {
    const parent = selected.value.parentCardId ?? selected.value.id
    const card = await collection.merge(parent, selected.value.level)
    toast.add({ title: `Fusion réussie : ${card.name} !`, color: 'success', icon: 'i-lucide-arrow-up-circle' })
    mergeOpen.value = false
    detailOpen.value = false
  } catch (err) {
    toast.add({ title: humanizeError(err), color: 'error' })
  } finally {
    actionLoading.value = false
  }
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
          <span class="tabular">{{ ownedCount }} / {{ total }} obtenues</span>
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
      <div class="pills">
        <button
          v-for="t in (['standard', 'shiny'] as const)"
          :key="t"
          class="pill"
          :class="{ 'pill--on': tab === t }"
          @click="tab = t"
        >
          {{ t === 'standard' ? 'Standard' : '✦ Shiny' }}
        </button>
      </div>
      <button
        class="pill pill--solo"
        :class="{ 'pill--on': sortByPity }"
        @click="sortByPity = !sortByPity"
      >
        <UIcon
          name="i-lucide-sparkles"
          class="size-4"
        />
        Chance shiny
      </button>
    </div>

    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      :title="errorMsg"
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
        <HoloCard
          :card="card"
          size="sm"
          :quantity="card.quantity"
          :ambient="false"
        />
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
.pills {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border-radius: 14px;
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
}
.pill {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: .9rem;
  border: none;
  background: transparent;
  color: var(--ui-text-muted);
  padding: 7px 16px;
  border-radius: 10px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all .15s ease;
}
.pill--on {
  background: var(--ui-bg-elevated);
  color: var(--ui-text-highlighted);
  box-shadow: 0 2px 7px rgba(0, 0, 0, .1);
}
.pill:not(.pill--on):hover { color: var(--ui-text); }
.pill--solo {
  border: 1px solid var(--ui-border);
  background: var(--ui-bg-elevated);
}
.pill--solo.pill--on {
  background: var(--color-poke-500);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 3px 0 var(--color-poke-700);
}

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
