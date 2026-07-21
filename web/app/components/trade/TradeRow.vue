<script setup lang="ts">
import type { DomainTrade } from '~/types/domain'

// Ligne d'échange : cartes demandée/proposée + acteurs + statut + actions selon
// mon rôle (initiateur/cible) et l'étape.
const props = defineProps<{ trade: DomainTrade, me: string | null, busy?: boolean }>()
const emit = defineEmits<{ accept: [], decline: [], confirm: [], reject: [], cancel: [] }>()

const isInitiator = computed(() => props.trade.initiatorId === props.me)

const STATUS: Record<DomainTrade['status'], { label: string, cls: string }> = {
  pending_target: { label: 'En attente de réponse', cls: 'wait' },
  pending_initiator: { label: 'En attente de confirmation', cls: 'wait' },
  completed: { label: 'Conclu', cls: 'ok' },
  declined: { label: 'Refusé', cls: 'ko' },
  cancelled: { label: 'Annulé', cls: 'ko' },
  expired: { label: 'Expiré', cls: 'muted' }
}
const status = computed(() => STATUS[props.trade.status])

// Actions à afficher pour MOI.
const canAcceptOffer = computed(() => props.trade.status === 'pending_target' && !isInitiator.value)
const canConfirm = computed(() => props.trade.status === 'pending_initiator' && isInitiator.value)
const canCancel = computed(() => props.trade.status === 'pending_target' && isInitiator.value)
</script>

<template>
  <div class="row">
    <div class="row__cards">
      <TradeCardMini
        label="Demandée"
        :name="trade.requested.name"
        :image-url="trade.requested.imageUrl"
        :rarity="trade.requested.rarity"
      />
      <UIcon
        name="i-lucide-arrow-left-right"
        class="row__swap size-5"
      />
      <TradeCardMini
        v-if="trade.offered"
        label="En retour"
        :name="trade.offered.name"
        :image-url="trade.offered.imageUrl"
        :rarity="trade.offered.rarity"
      />
      <div
        v-else
        class="row__pending"
      >
        <span class="row__q">?</span>
        <span>en retour</span>
      </div>
    </div>

    <div class="row__meta">
      <p class="row__who">
        <b>{{ trade.initiatorUsername }}</b> → <b>{{ trade.targetUsername }}</b>
      </p>
      <span
        class="row__status"
        :class="`row__status--${status.cls}`"
      >{{ status.label }}</span>
    </div>

    <div
      v-if="canAcceptOffer || canConfirm || canCancel"
      class="row__actions"
    >
      <template v-if="canAcceptOffer">
        <PButton
          color="success"
          :disabled="busy"
          @click="emit('accept')"
        >
          <UIcon
            name="i-lucide-check"
            class="size-4"
          /> Accepter
        </PButton>
        <PButton
          color="neutral"
          :disabled="busy"
          @click="emit('decline')"
        >
          Refuser
        </PButton>
      </template>
      <template v-else-if="canConfirm">
        <PButton
          color="success"
          :disabled="busy"
          @click="emit('confirm')"
        >
          <UIcon
            name="i-lucide-check"
            class="size-4"
          /> Confirmer
        </PButton>
        <PButton
          color="neutral"
          :disabled="busy"
          @click="emit('reject')"
        >
          Refuser
        </PButton>
      </template>
      <PButton
        v-else-if="canCancel"
        color="error"
        :disabled="busy"
        @click="emit('cancel')"
      >
        Annuler
      </PButton>
    </div>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-radius: 16px;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, .04);
}
.row__cards { display: flex; align-items: center; gap: 10px; }
.row__swap { color: var(--ui-text-dimmed); flex: none; }
.row__pending { display: flex; flex-direction: column; align-items: center; gap: 3px; width: 82px; font-size: .62rem; font-weight: 700; color: var(--ui-text-dimmed); text-transform: uppercase; }
.row__q {
  width: 62px;
  height: 62px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  border: 2px dashed var(--ui-border-accented);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.6rem;
  color: var(--ui-text-dimmed);
}
.row__meta { flex: 1; min-width: 140px; display: flex; flex-direction: column; gap: 5px; }
.row__who { font-size: .88rem; color: var(--ui-text-toned); }
.row__who b { color: var(--ui-text-highlighted); font-weight: 700; }
.row__status {
  align-self: flex-start;
  font-size: .7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .03em;
  padding: 3px 10px;
  border-radius: 999px;
}
.row__status--wait { color: #cc6f16; background: color-mix(in oklab, #f59333 16%, transparent); }
.row__status--ok { color: #3f9e66; background: color-mix(in oklab, #5bbf82 16%, transparent); }
.row__status--ko { color: var(--color-poke-600); background: var(--color-poke-50); }
.row__status--muted { color: var(--ui-text-dimmed); background: var(--ui-bg-accented); }
.row__actions { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
