<script setup lang="ts">
import type { ZarbiForm } from '~/types/domain'
import { useCollectionStore, ZARBI_SELL_PRICE, zarbiSellable } from '~/stores/collection'

// Panneau Zarbi — les 28 formes cosmétiques (! ? A-Z), en standard et en shiny.
//
// Zarbi est le seul Pokémon du jeu à sortir du modèle « une carte = une
// entrée » : il occupe UNE case du dex mais se décline en 28 glyphes, servis
// par un endpoint à part. D'où ce panneau plutôt qu'une place dans la grille.
//
// Il suit l'onglet standard/shiny de la page, comme le reste de la collection :
// afficher les deux dex côte à côte doublerait la grille sans rien apprendre.
const props = defineProps<{ shiny: boolean }>()

const collection = useCollectionStore()
const toast = useToast()

const forms = computed<ZarbiForm[]>(() =>
  props.shiny ? collection.zarbiShiny : collection.zarbiStandard)
const ownedCount = computed(() =>
  props.shiny ? collection.zarbiOwnedShiny : collection.zarbiOwnedStandard)

// Le dex shiny ne se débloque qu'une fois le dex standard complété — règle du
// jeu. On l'annonce plutôt que de laisser 28 dos de carte sans explication.
const shinyLocked = computed(() => props.shiny && !collection.zarbiShinyUnlocked)

// L'ouverture est portée par la PAGE : le panneau change de contenu quand on
// bascule standard/shiny, et Vue le remonte à cette occasion — un `ref` local
// se serait refermé tout seul sous les doigts du joueur.
const open = defineModel<boolean>('open', { default: false })

const { pending: selling, run } = useAsyncAction()
const toSell = ref<ZarbiForm | null>(null)
const sellOpen = ref(false)

function askSell(f: ZarbiForm) {
  toSell.value = f
  sellOpen.value = true
}
function confirmSell() {
  const f = toSell.value
  if (!f) return
  return run(async () => {
    const res = await collection.sellZarbi(f.id)
    toast.add({
      title: `+${res.sellPrice ?? ZARBI_SELL_PRICE} 🪙`,
      description: `Zarbi ${f.form}${f.isShiny ? ' ✦' : ''} vendu.`,
      color: 'success',
      icon: 'i-lucide-coins'
    })
    sellOpen.value = false
    toSell.value = null
  })
}
</script>

<template>
  <PPanel class="zp">
    <button
      type="button"
      class="zp__head"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="zp__glyph">?</span>
      <span class="zp__title">
        Zarbi{{ shiny ? ' ✦' : '' }}
        <span class="zp__count tabular">{{ ownedCount }} / {{ forms.length }} formes</span>
      </span>
      <UIcon
        :name="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        class="size-5 zp__chev"
      />
    </button>

    <!-- Hors du corps repliable : c'est l'explication d'un dex vide, elle doit
         se lire sans avoir à déplier quoi que ce soit. -->
    <p
      v-if="shinyLocked"
      class="zp__locked"
    >
      <UIcon
        name="i-lucide-lock"
        class="size-4"
      />
      Les Zarbi shiny se débloquent une fois les
      {{ collection.zarbiStandard.length }} formes standards réunies.
    </p>

    <div
      v-if="open"
      class="zp__body"
    >
      <div class="zp__grid">
        <div
          v-for="f in forms"
          :key="f.id"
          class="zf"
          :class="{ 'zf--off': !f.owned }"
        >
          <span
            v-if="f.owned"
            class="zf__art"
          >
            <img
              :src="f.imageUrl"
              :alt="`Zarbi ${f.form}`"
              loading="lazy"
              decoding="async"
            >
            <span
              v-if="f.quantity > 1"
              class="zf__qty tabular"
            >×{{ f.quantity }}</span>
          </span>
          <span
            v-else
            class="zf__back"
            aria-hidden="true"
          >?</span>

          <span class="zf__form">{{ f.owned ? f.form : '???' }}</span>

          <button
            v-if="zarbiSellable(f)"
            type="button"
            class="zf__sell"
            :disabled="selling"
            @click="askSell(f)"
          >
            Vendre
          </button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-model:open="sellOpen"
      title="Vendre cette forme ?"
      :message="`Zarbi ${toSell?.form ?? ''}${toSell?.isShiny ? ' ✦' : ''} sera définitivement vendu contre ${ZARBI_SELL_PRICE} 🪙.`"
      confirm-label="Vendre"
      danger
      :loading="selling"
      @confirm="confirmSell"
    />
  </PPanel>
</template>

<style scoped>
.zp__head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 11px;
  cursor: pointer;
  text-align: left;
}
.zp__glyph {
  flex: none;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.2rem;
  color: #6f42a8;
  background: color-mix(in oklab, #9b6fd4 16%, transparent);
}
.zp__title {
  flex: 1;
  min-width: 0;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--ui-text-highlighted);
}
.zp__count {
  display: block;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: .82rem;
  color: var(--ui-text-muted);
}
.zp__chev { color: var(--ui-text-muted); flex: none; }

.zp__body { margin-top: 14px; }
.zp__locked {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: .84rem;
  font-weight: 600;
  color: var(--ui-text-muted);
  background: var(--ui-bg-muted);
}

.zp__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
  gap: 9px;
}
.zf {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 5px 7px;
  border-radius: 13px;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
}
.zf--off { background: var(--ui-bg-muted); }
.zf__art, .zf__back {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 52px;
}
.zf__art img { width: 100%; height: 100%; min-width: 0; min-height: 0; object-fit: contain; }
.zf__back {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.4rem;
  color: var(--ui-border-accented);
}
.zf__qty {
  position: absolute;
  right: 0;
  bottom: -2px;
  font-size: .64rem;
  font-weight: 800;
  color: var(--ui-text-muted);
}
.zf__form {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .8rem;
  color: var(--ui-text);
}
.zf--off .zf__form { color: var(--ui-text-dimmed); }
.zf__sell {
  font-size: .66rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  color: var(--color-poke-600);
  background: var(--color-poke-50);
  cursor: pointer;
  transition: background .15s ease;
}
.zf__sell:hover:not(:disabled) { background: var(--color-poke-100); }
.zf__sell:disabled { opacity: .5; cursor: progress; }
</style>
