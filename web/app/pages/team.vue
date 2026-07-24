<script setup lang="ts">
import type { TeamMember } from '~/types/domain'
import { useStorage } from '@vueuse/core'
import { useTeamStore, TEAM_MAX, REMOVE_COST } from '~/stores/team'
import { inventoryRepo } from '~/repositories'
import { TYPE_SLUG_TO_NAME } from '~/utils/poke'
import { STORAGE_KEYS } from '~/constants/storage-keys'

// Page Équipe — 6 slots. Ajout par « roulette d'équipe » (destructif : la carte
// tirée quitte la collection), retrait à -10 🪙 (définitif), réorganisation par
// échange de 2 slots, et vidage complet. Confirmations proportionnelles au risque.
const team = useTeamStore()
const wallet = useWalletStore()
const collection = useCollectionStore()
const prefs = usePreferencesStore()
const toast = useToast()

const motionOn = computed(() => !prefs.effectiveReducedMotion)
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 6 emplacements : membres triés puis complétés par des slots vides.
const slots = computed<(TeamMember | null)[]>(() => {
  const filled = team.sorted
  return Array.from({ length: TEAM_MAX }, (_, i) => filled[i] ?? null)
})
const eligibleCount = computed(() =>
  collection.cards.filter(c => c.owned && !c.isShiny && c.rarity !== 'Légendaire').length)

// Ticket Type actif (le prochain tirage d'équipe sera filtré).
const activeTypeTicket = ref<string | null>(null)
const activeTypeLabel = computed(() =>
  activeTypeTicket.value ? (TYPE_SLUG_TO_NAME[activeTypeTicket.value] ?? activeTypeTicket.value) : null)

const { loading, errorMsg } = usePageData(async () => {
  await team.ensureFresh()
  collection.ensureFresh().catch(() => {})
  inventoryRepo.get(useApi())
    .then((inv) => { activeTypeTicket.value = inv.activeTypeTicket })
    .catch(() => {})
})

// ─── Réorganisation (échange de 2 slots) ──────────────────────────────────────
const reorganizing = ref(false)
const swapSel = ref<TeamMember | null>(null)

function toggleReorganize() {
  reorganizing.value = !reorganizing.value
  swapSel.value = null
}
async function onSlotClick(member: TeamMember) {
  if (!reorganizing.value) return
  if (!swapSel.value) {
    swapSel.value = member
    return
  }
  if (swapSel.value.teamEntryId === member.teamEntryId) {
    swapSel.value = null
    return
  }
  const first = swapSel.value
  swapSel.value = null
  try {
    await team.swap(first, member)
  } catch (err) {
    toast.add({ title: humanizeError(err), color: 'error' })
  }
}

// ─── Roulette d'équipe (destructive) ──────────────────────────────────────────
type RollPhase = 'confirm' | 'rolling' | 'result'
const rollOpen = ref(false)
const rollPhase = ref<RollPhase>('confirm')
const rolled = ref<TeamMember | null>(null)
const rollError = ref('')
const skipRollConfirm = useStorage(STORAGE_KEYS.teamRollSkipConfirm, false)

function openRoll() {
  if (team.isFull) return
  rolled.value = null
  rollError.value = ''
  if (skipRollConfirm.value) {
    void startRoll()
  } else {
    rollPhase.value = 'confirm'
    rollOpen.value = true
  }
}

async function startRoll() {
  rollPhase.value = 'rolling'
  rollError.value = ''
  rollOpen.value = true
  try {
    const [member] = await Promise.all([team.roll(), wait(motionOn.value ? 1500 : 60)])
    rolled.value = member
    rollPhase.value = 'result'
  } catch (err) {
    rollError.value = humanizeError(err)
    rollPhase.value = 'confirm'
  }
}

// ─── Retrait / vidage ─────────────────────────────────────────────────────────
const removeTarget = ref<TeamMember | null>(null)
const removeOpen = ref(false)
const clearOpen = ref(false)
const { pending: actionLoading, run } = useAsyncAction()

function askRemove(member: TeamMember) {
  removeTarget.value = member
  removeOpen.value = true
}
function confirmRemove() {
  const target = removeTarget.value
  if (!target) return
  if (!canAffordRemove.value) {
    toast.add({ title: `Il te manque des pièces (retrait : ${REMOVE_COST} 🪙).`, color: 'error' })
    return
  }
  return run(async () => {
    await team.remove(target.teamEntryId)
    toast.add({ title: `${target.name} a quitté l'équipe`, icon: 'i-lucide-user-minus' })
    removeOpen.value = false
  })
}
function confirmClear() {
  return run(async () => {
    await team.clear()
    reorganizing.value = false
    toast.add({ title: 'Équipe vidée', icon: 'i-lucide-trash-2' })
    clearOpen.value = false
  })
}

const canAffordRemove = computed(() => wallet.canAfford(REMOVE_COST))
</script>

<template>
  <div class="team">
    <!-- En-tête -->
    <header class="team__head">
      <div class="team__title-wrap">
        <h1 class="team__title font-display">
          Mon équipe
        </h1>
        <span
          class="team__count tabular"
          :class="{ 'team__count--full': team.isFull }"
        >{{ team.count }}/{{ TEAM_MAX }}</span>
      </div>
      <CoinBalance />
    </header>
    <p class="team__lead">
      Compose ton équipe à la roulette. Chaque Pokémon tiré quitte
      définitivement ta collection — choisis-les avec soin.
    </p>

    <!-- Ticket Type actif -->
    <div
      v-if="activeTypeLabel"
      class="ticket"
    >
      <UIcon
        name="i-lucide-ticket"
        class="size-5"
      />
      <span>Ticket Type actif : <b>{{ activeTypeLabel }}</b> — ton prochain tirage d'équipe sera filtré.</span>
    </div>

    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      :title="errorMsg"
    />

    <!-- Bandeau de réorganisation -->
    <Transition name="banner">
      <div
        v-if="reorganizing"
        class="reorg"
      >
        <UIcon
          name="i-lucide-arrow-left-right"
          class="size-5"
        />
        <span v-if="!swapSel">Sélectionne un premier Pokémon à déplacer.</span>
        <span v-else><b>{{ swapSel.name }}</b> sélectionné — choisis le slot avec qui échanger.</span>
      </div>
    </Transition>

    <!-- Roster -->
    <div
      v-if="loading"
      class="roster"
    >
      <USkeleton
        v-for="i in TEAM_MAX"
        :key="i"
        class="aspect-[63/88] w-[168px] rounded-2xl"
      />
    </div>
    <div
      v-else
      class="roster"
    >
      <template
        v-for="(slot, i) in slots"
        :key="i"
      >
        <!-- Slot occupé -->
        <div
          v-if="slot"
          class="slot"
        >
          <button
            class="slot__card"
            :class="{
              'slot__card--pick': reorganizing,
              'slot__card--sel': swapSel?.teamEntryId === slot.teamEntryId
            }"
            :disabled="!reorganizing"
            :aria-label="reorganizing ? `Déplacer ${slot.name}` : slot.name"
            @click="onSlotClick(slot)"
          >
            <TeamCard
              :member="slot"
              size="md"
              :interactive="false"
              :position="i + 1"
            />
          </button>
          <button
            v-if="!reorganizing"
            class="slot__remove"
            :aria-label="`Retirer ${slot.name}`"
            @click="askRemove(slot)"
          >
            <UIcon
              name="i-lucide-x"
              class="size-4"
            />
          </button>
        </div>

        <!-- Slot vide -->
        <button
          v-else
          class="slot slot--empty"
          :disabled="reorganizing || team.isFull"
          aria-label="Ajouter un Pokémon"
          @click="openRoll"
        >
          <PokeBall :size="52" />
          <span>Emplacement libre</span>
        </button>
      </template>
    </div>

    <!-- Actions -->
    <div class="team__actions">
      <PButton
        :disabled="team.isFull || reorganizing"
        @click="openRoll"
      >
        <UIcon
          :name="team.isFull ? 'i-lucide-check' : 'i-lucide-sparkles'"
          class="size-5"
        />
        {{ team.isFull ? 'Équipe complète' : 'Ajouter un Pokémon' }}
      </PButton>

      <PButton
        v-if="team.count >= 2"
        :color="reorganizing ? 'secondary' : 'neutral'"
        @click="toggleReorganize"
      >
        <UIcon
          name="i-lucide-arrow-left-right"
          class="size-5"
        />
        {{ reorganizing ? 'Terminer' : 'Réorganiser' }}
      </PButton>

      <PButton
        v-if="!team.isEmpty && !reorganizing"
        color="error"
        @click="clearOpen = true"
      >
        <UIcon
          name="i-lucide-trash-2"
          class="size-5"
        />
        Vider
      </PButton>
    </div>

    <!-- ═══ Roulette d'équipe ═══ -->
    <UModal
      v-model:open="rollOpen"
      :title="rollPhase === 'result' ? 'Recrue !' : 'Roulette d\'équipe'"
      :dismissible="rollPhase !== 'rolling'"
      :ui="{ footer: 'justify-end gap-2' }"
    >
      <template #body>
        <!-- Confirmation (sacrifice) -->
        <div
          v-if="rollPhase === 'confirm'"
          class="roll-confirm"
        >
          <div class="roll-confirm__warn">
            <UIcon
              name="i-lucide-triangle-alert"
              class="size-5"
            />
            <p>
              La roulette pioche <b>au hasard</b> une carte de ta collection
              (hors Légendaires et Shiny). Elle <b>quitte définitivement</b>
              ta collection pour rejoindre ton équipe.
            </p>
          </div>
          <p
            v-if="collection.cards.length"
            class="roll-confirm__pool"
          >
            {{ eligibleCount }} carte{{ eligibleCount > 1 ? 's' : '' }} éligible{{ eligibleCount > 1 ? 's' : '' }} dans ta collection.
          </p>
          <UAlert
            v-if="rollError"
            color="error"
            variant="soft"
            :title="rollError"
          />
          <UCheckbox
            v-model="skipRollConfirm"
            label="Ne plus me demander"
          />
        </div>

        <!-- Suspense -->
        <div
          v-else-if="rollPhase === 'rolling'"
          class="roll-spin"
        >
          <div class="roll-spin__ball">
            <PokeBall :size="88" />
          </div>
          <p class="font-display">
            L'équipe se forme…
          </p>
        </div>

        <!-- Résultat -->
        <div
          v-else-if="rolled"
          class="roll-result"
        >
          <span class="roll-result__burst" />
          <div class="roll-result__card">
            <TeamCard
              :member="rolled"
              size="lg"
              :interactive="false"
            />
          </div>
          <p class="roll-result__name font-display">
            {{ rolled.name }} rejoint ton équipe !
          </p>
          <p class="roll-result__sub">
            {{ rolled.rarity }} · {{ rolled.type }}
          </p>
        </div>
      </template>

      <template
        v-if="rollPhase !== 'rolling'"
        #footer
      >
        <template v-if="rollPhase === 'confirm'">
          <PButton
            color="neutral"
            @click="rollOpen = false"
          >
            Annuler
          </PButton>
          <PButton
            :disabled="collection.cards.length > 0 && eligibleCount === 0"
            @click="startRoll"
          >
            Lancer la roulette
          </PButton>
        </template>
        <template v-else>
          <PButton
            v-if="!team.isFull"
            color="neutral"
            @click="startRoll"
          >
            Encore
          </PButton>
          <PButton @click="rollOpen = false">
            Terminer
          </PButton>
        </template>
      </template>
    </UModal>

    <!-- Confirmation retrait -->
    <ConfirmDialog
      v-model:open="removeOpen"
      title="Retirer ce Pokémon ?"
      :message="`Retirer ${removeTarget?.name} coûte ${REMOVE_COST} 🪙 et est définitif : la carte ne revient pas dans ta collection.`"
      :confirm-label="canAffordRemove ? `Retirer (−${REMOVE_COST} 🪙)` : 'Solde insuffisant'"
      danger
      :loading="actionLoading"
      @confirm="confirmRemove"
    />

    <!-- Confirmation vidage -->
    <ConfirmDialog
      v-model:open="clearOpen"
      title="Vider toute l'équipe ?"
      message="Tous les Pokémon quittent l'équipe. C'est gratuit, mais définitif : aucune carte ne revient en collection."
      confirm-label="Tout vider"
      danger
      :loading="actionLoading"
      @confirm="confirmClear"
    />
  </div>
</template>

<style scoped>
.team { display: flex; flex-direction: column; gap: 16px; }
.team__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.team__title-wrap { display: flex; align-items: center; gap: 12px; }
.team__title { font-weight: 700; font-size: 1.7rem; margin: 0; }
.team__count {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .95rem;
  color: var(--ui-text-muted);
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
  padding: 3px 12px;
  border-radius: 999px;
}
.team__count--full {
  color: #fff;
  background: linear-gradient(150deg, #8fd6a8, #5bbf82);
  border-color: transparent;
  box-shadow: 0 2px 0 #3f9e66;
}
.team__lead {
  font-weight: 600;
  font-size: .9rem;
  color: var(--ui-text-muted);
  max-width: 46rem;
  margin: -6px 0 0;
}

.ticket {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: .86rem;
  font-weight: 600;
  color: #7a4c07;
  background: linear-gradient(150deg, #fff2d6, #ffe6b0);
  border: 1px solid rgba(224, 169, 46, .4);
}
.ticket b { color: #5c3a00; }

.reorg {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: .88rem;
  font-weight: 600;
  color: var(--color-poke-700);
  background: var(--color-poke-50);
  border: 1px solid color-mix(in oklab, var(--color-poke-500) 25%, transparent);
}

.roster {
  display: grid;
  grid-template-columns: repeat(auto-fill, 168px);
  justify-content: center;
  gap: 18px;
}
.slot { position: relative; width: 168px; }
.slot__card {
  display: block;
  width: 100%;
  border: none;
  background: none;
  padding: 0;
  border-radius: 14px;
}
.slot__card--pick { cursor: pointer; transition: transform .18s var(--ease-pop); }
.slot__card--pick:hover { transform: translateY(-4px); }
.slot__card--sel {
  outline: 3px solid var(--color-poke-500);
  outline-offset: 4px;
  border-radius: 16px;
}
.slot__card:focus-visible {
  outline: 3px solid var(--color-poke-400);
  outline-offset: 4px;
  border-radius: 16px;
}
.slot__remove {
  position: absolute;
  top: -8px;
  right: -8px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: linear-gradient(150deg, #f4796b, #e2402f);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 3px 8px rgba(180, 40, 30, .4);
  opacity: 0;
  transform: scale(.8);
  transition: opacity .15s ease, transform .15s var(--ease-pop);
}
.slot:hover .slot__remove,
.slot__remove:focus-visible { opacity: 1; transform: scale(1); }

.slot--empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  aspect-ratio: 63 / 88;
  border-radius: calc(168px * 0.075);
  border: 2px dashed var(--ui-border-accented);
  background: var(--ui-bg-muted);
  color: var(--ui-text-dimmed);
  font-family: var(--font-display);
  font-weight: 600;
  font-size: .8rem;
  cursor: pointer;
  transition: border-color .18s ease, background .18s ease, transform .18s var(--ease-pop);
}
.slot--empty :deep(.pokeball) { opacity: .5; filter: grayscale(.3); transition: opacity .18s ease; }
.slot--empty:not(:disabled):hover {
  border-color: var(--color-poke-400);
  background: var(--color-poke-50);
  color: var(--color-poke-600);
  transform: translateY(-3px);
}
.slot--empty:not(:disabled):hover :deep(.pokeball) { opacity: 1; }
.slot--empty:disabled { cursor: default; opacity: .7; }

.team__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 4px;
}

/* Roulette : suspense + résultat */
.roll-confirm { display: flex; flex-direction: column; gap: 14px; }
.roll-confirm__warn {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  color: var(--ui-text-toned);
  font-size: .9rem;
  line-height: 1.5;
}
.roll-confirm__warn :deep(svg) { color: var(--color-poke-500); flex: none; margin-top: 2px; }
.roll-confirm__pool {
  font-size: .82rem;
  font-weight: 700;
  color: var(--ui-text-muted);
}
.roll-spin {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 26px 0;
  color: var(--color-poke-600);
  font-weight: 700;
  font-size: 1.05rem;
}
.roll-spin__ball { animation: rollshake .7s ease-in-out infinite; }
@keyframes rollshake {
  0%, 100% { transform: rotate(-14deg) translateY(0); }
  50% { transform: rotate(14deg) translateY(-6px); }
}
.roll-result {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 10px 0 4px;
  text-align: center;
}
.roll-result__burst {
  position: absolute;
  top: 40%;
  left: 50%;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 235, 170, .9), transparent 65%);
  animation: burst .7s ease-out both;
  pointer-events: none;
}
.roll-result__card {
  position: relative;
  animation: emerge .8s cubic-bezier(.2, .8, .3, 1) both;
}
.roll-result__name { font-weight: 700; font-size: 1.15rem; }
.roll-result__sub { font-size: .82rem; font-weight: 700; color: var(--ui-text-muted); }

.banner-enter-active, .banner-leave-active { transition: opacity .2s ease, transform .2s var(--ease-pop); }
.banner-enter-from, .banner-leave-to { opacity: 0; transform: translateY(-6px); }

@media (prefers-reduced-motion: reduce) {
  .roll-spin__ball, .roll-result__burst, .roll-result__card { animation: none; }
}
</style>
