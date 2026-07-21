<script setup lang="ts">
import type { TradeCard, RealRarity } from '~/types/domain'
import { RARITY_META } from '~/utils/cardTheme'

// Sélecteur de carte (modale) : onglets de rareté + grille. Charge les cartes
// via `load(rarity)`. Sert au create (cartes de l'autre) et au respond (les miennes).
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{
  title: string
  subtitle?: string
  rarities: RealRarity[]
  load: (rarity: RealRarity) => Promise<TradeCard[]>
  busy?: boolean
}>()
const emit = defineEmits<{ pick: [card: TradeCard] }>()

const rarity = ref<RealRarity>(props.rarities[0] ?? 'Commun')
const cards = ref<TradeCard[]>([])
const loading = ref(false)

async function fetchCards() {
  loading.value = true
  try {
    cards.value = await props.load(rarity.value)
  } catch {
    cards.value = []
  } finally {
    loading.value = false
  }
}

watch(open, (v) => {
  if (v) {
    rarity.value = props.rarities[0] ?? 'Commun'
    fetchCards()
  }
})
watch(rarity, () => {
  if (open.value) fetchCards()
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
  >
    <template #body>
      <div class="pk">
        <p
          v-if="subtitle"
          class="pk__sub"
        >
          {{ subtitle }}
        </p>
        <div
          v-if="rarities.length > 1"
          class="pk__tabs"
        >
          <button
            v-for="r in rarities"
            :key="r"
            class="pk__tab"
            :class="{ 'pk__tab--on': rarity === r }"
            :style="{ '--r': RARITY_META[r].color }"
            @click="rarity = r"
          >
            {{ r }}
          </button>
        </div>

        <div
          v-if="loading"
          class="pk__load"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-6 animate-spin"
          />
        </div>
        <div
          v-else-if="cards.length"
          class="pk__grid"
        >
          <button
            v-for="c in cards"
            :key="c.id"
            class="pcard"
            :style="{ '--r': RARITY_META[c.rarity].color }"
            :disabled="busy"
            @click="emit('pick', c)"
          >
            <span
              v-if="!c.viewerOwns"
              class="pcard__new"
            >✦ Nouveau</span>
            <span class="pcard__frame">
              <img
                :src="c.imageUrl"
                :alt="c.name"
                loading="lazy"
              >
            </span>
            <span class="pcard__name">{{ c.name }}</span>
            <span class="pcard__qty tabular">×{{ c.quantity }}</span>
          </button>
        </div>
        <p
          v-else
          class="pk__empty"
        >
          Aucune carte {{ rarity }} éligible.
        </p>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.pk { display: flex; flex-direction: column; gap: 12px; }
.pk__sub { font-size: .85rem; color: var(--ui-text-muted); }
.pk__tabs { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--ui-bg-muted); border: 1px solid var(--ui-border); align-self: flex-start; }
.pk__tab {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: .84rem;
  border: none;
  background: transparent;
  color: var(--ui-text-muted);
  padding: 5px 14px;
  border-radius: 9px;
  cursor: pointer;
}
.pk__tab--on { background: var(--ui-bg-elevated); color: var(--r); box-shadow: 0 2px 6px rgba(0, 0, 0, .1); }
.pk__load { display: grid; place-items: center; padding: 40px; color: var(--color-poke-500); }
.pk__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 10px;
  max-height: 52vh;
  overflow-y: auto;
  padding: 2px;
}
.pcard {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 4px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 12px;
  transition: transform .15s var(--ease-pop);
}
.pcard:hover:not(:disabled) { transform: translateY(-3px); }
.pcard:disabled { opacity: .5; cursor: default; }
.pcard:focus-visible { outline: 2px solid var(--color-poke-400); outline-offset: 2px; }
.pcard__frame {
  width: 60px;
  height: 60px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: radial-gradient(circle at 50% 30%, color-mix(in oklab, var(--r) 20%, #fff), color-mix(in oklab, var(--r) 8%, #fff));
  box-shadow: inset 0 0 0 2px var(--r);
}
.pcard__frame img { width: 92%; height: 92%; object-fit: contain; }
.pcard__name { font-weight: 700; font-size: .72rem; color: var(--ui-text); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pcard__qty { font-size: .66rem; font-weight: 800; color: var(--ui-text-dimmed); }
.pcard__new {
  position: absolute;
  top: -4px;
  right: -2px;
  z-index: 1;
  font-size: .58rem;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(150deg, #8fd6a8, #5bbf82);
  padding: 1px 6px;
  border-radius: 999px;
  box-shadow: 0 2px 5px rgba(60, 140, 90, .4);
}
.pk__empty { text-align: center; color: var(--ui-text-dimmed); font-size: .88rem; padding: 26px 0; }
</style>
