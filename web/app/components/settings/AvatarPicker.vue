<script setup lang="ts">
import type { DomainCard } from '~/types/domain'
import { RARITY_META } from '~/utils/cardTheme'

// Sélecteur d'avatar (modale) : grille des cartes possédées éligibles. Charge à
// l'ouverture, marque l'avatar actuel, met en avant les shiny.
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{
  load: () => Promise<DomainCard[]>
  currentUrl?: string | null
  busy?: boolean
}>()
const emit = defineEmits<{ pick: [card: DomainCard] }>()

const RANK: Record<DomainCard['rarity'], number> = { Légendaire: 0, Épique: 1, Rare: 2, Commun: 3 }

const cards = ref<DomainCard[]>([])
const loading = ref(false)

const sorted = computed(() => [...cards.value].sort((a, b) => {
  if (a.isShiny !== b.isShiny) return a.isShiny ? -1 : 1
  if (RANK[a.rarity] !== RANK[b.rarity]) return RANK[a.rarity] - RANK[b.rarity]
  return a.name.localeCompare(b.name, 'fr')
}))

async function fetchCards() {
  loading.value = true
  try {
    cards.value = await props.load()
  } catch {
    cards.value = []
  } finally {
    loading.value = false
  }
}

function isCurrent(c: DomainCard): boolean {
  return !!props.currentUrl && c.imageUrl === props.currentUrl
}

watch(open, (v) => {
  if (v) fetchCards()
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Choisir un avatar"
    description="Une carte de ta collection représentera ton profil."
  >
    <template #body>
      <div class="ap">
        <div
          v-if="loading"
          class="ap__load"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-6 animate-spin"
          />
        </div>
        <div
          v-else-if="sorted.length"
          class="ap__grid"
        >
          <button
            v-for="c in sorted"
            :key="c.id"
            class="acard"
            :class="{ 'acard--shiny': c.isShiny, 'acard--on': isCurrent(c) }"
            :style="{ '--r': RARITY_META[c.rarity].color }"
            :disabled="busy"
            @click="emit('pick', c)"
          >
            <span class="acard__frame">
              <img
                :src="c.imageUrl"
                :alt="c.name"
                loading="lazy"
              >
              <UIcon
                v-if="isCurrent(c)"
                name="i-lucide-check"
                class="acard__check"
              />
              <span
                v-if="c.isShiny"
                class="acard__spark"
              >✦</span>
            </span>
            <span class="acard__name">{{ c.name }}</span>
          </button>
        </div>
        <p
          v-else
          class="ap__empty"
        >
          Aucune carte éligible pour l'instant. Ouvre des boosters pour débloquer des avatars !
        </p>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.ap { display: flex; flex-direction: column; }
.ap__load { display: grid; place-items: center; padding: 44px; color: var(--color-poke-500); }
.ap__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 12px;
  max-height: 56vh;
  overflow-y: auto;
  padding: 2px;
}
.acard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 14px;
  transition: transform .15s var(--ease-pop);
}
.acard:hover:not(:disabled) { transform: translateY(-3px); }
.acard:disabled { opacity: .5; cursor: default; }
.acard:focus-visible { outline: 2px solid var(--color-poke-400); outline-offset: 2px; }
.acard__frame {
  position: relative;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: radial-gradient(circle at 50% 32%, color-mix(in oklab, var(--r) 22%, #fff), color-mix(in oklab, var(--r) 8%, #fff));
  box-shadow: 0 0 0 2px var(--ui-bg-elevated), 0 0 0 3px var(--r);
}
.acard--shiny .acard__frame { box-shadow: 0 0 0 2px var(--ui-bg-elevated), 0 0 0 3px #c9b3ff, 0 0 10px rgba(201, 179, 255, .6); }
.acard--on .acard__frame { box-shadow: 0 0 0 2px var(--ui-bg-elevated), 0 0 0 3px var(--color-poke-500), 0 0 12px rgba(238, 90, 72, .5); }
.acard__frame img { width: 88%; height: 88%; object-fit: contain; }
.acard__check {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 26px;
  height: 26px;
  color: #fff;
  background: color-mix(in oklab, var(--color-poke-500) 88%, transparent);
  border-radius: 50%;
  padding: 4px;
}
.acard__spark {
  position: absolute;
  top: 1px;
  right: 3px;
  font-size: .7rem;
  font-weight: 800;
  color: #a684ff;
  text-shadow: 0 0 4px rgba(201, 179, 255, .8);
}
.acard__name { font-weight: 700; font-size: .7rem; color: var(--ui-text-toned); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ap__empty { text-align: center; color: var(--ui-text-dimmed); font-size: .88rem; padding: 30px 10px; }
</style>
