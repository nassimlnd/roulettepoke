<script setup lang="ts">
import type { DomainOwnedCard } from '~/types/domain'
import { SELL_PRICE } from '~/utils/poke'

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
  return `~${Math.round(((card.quantity + 1) / 500) * 1000) / 10}%`
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
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-display text-2xl font-extrabold">
        Ma collection
      </h1>
      <CoinBalance />
    </div>

    <!-- Onglets + tri -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex rounded-lg border border-default p-0.5">
        <button
          v-for="t in (['standard', 'shiny'] as const)"
          :key="t"
          class="rounded-md px-3 py-1 text-sm font-medium transition-colors"
          :class="tab === t ? 'bg-primary text-inverted' : 'text-muted hover:text-default'"
          @click="tab = t"
        >
          {{ t === 'standard' ? 'Standard' : '✦ Shiny' }}
        </button>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm text-muted tabular">{{ ownedCount }} / {{ total }} obtenues</span>
        <UButton
          :variant="sortByPity ? 'solid' : 'outline'"
          color="neutral"
          size="sm"
          icon="i-lucide-sparkles"
          label="Chance shiny"
          @click="sortByPity = !sortByPity"
        />
      </div>
    </div>

    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      :title="errorMsg"
    />

    <!-- Grille -->
    <div
      v-if="loading"
      class="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-3"
    >
      <USkeleton
        v-for="i in 18"
        :key="i"
        class="aspect-[3/4] rounded-xl"
      />
    </div>
    <div
      v-else
      class="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-3"
    >
      <button
        v-for="card in cards"
        :key="card.id"
        class="group relative text-left focus-visible:outline-none"
        :disabled="!card.owned"
        @click="openDetail(card)"
      >
        <GameCard
          :card="card"
          size="sm"
          :owned="card.owned"
          :quantity="card.quantity"
          class="w-full transition-transform group-hover:-translate-y-0.5"
        />
        <span
          v-if="sortByPity && card.owned && !card.isShiny"
          class="absolute inset-x-1 bottom-1 rounded bg-default/85 py-0.5 text-center text-[0.6rem] font-semibold text-rarity-shiny"
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
          class="flex flex-col items-center gap-3"
        >
          <GameCard
            :card="selected"
            size="lg"
            :quantity="selected.quantity"
          />
          <div class="text-center">
            <RarityBadge
              :rarity="selected.rarity"
              :shiny="selected.isShiny"
            />
            <p class="mt-1 text-sm text-muted">
              {{ selected.quantity }} exemplaire{{ selected.quantity > 1 ? 's' : '' }}
              <template v-if="!selected.isShiny">
                · chance shiny estimée {{ shinyChance(selected) }}
              </template>
            </p>
          </div>
          <div class="flex gap-2">
            <UButton
              v-if="canMerge(selected)"
              icon="i-lucide-arrow-up-circle"
              label="Fusionner"
              @click="mergeOpen = true"
            />
            <UButton
              icon="i-lucide-coins"
              color="neutral"
              variant="outline"
              :label="selected.isShiny ? 'Vendre (Charme)' : `Vendre (${sellPrice} 🪙)`"
              @click="sellOpen = true"
            />
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
      :message="`Cette fusion consomme 10 exemplaires de ${selected?.name} pour obtenir son évolution. Cette action est définitive.`"
      confirm-label="Fusionner"
      danger
      :loading="actionLoading"
      @confirm="confirmMerge"
    />
  </div>
</template>
