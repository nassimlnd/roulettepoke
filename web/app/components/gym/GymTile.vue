<script setup lang="ts">
import type { DomainGym } from '~/types/domain'
import { typeSlug } from '~/utils/poke'

// Tuile d'arène (grille) — teintée par le type, badge en évidence, statut.
const props = defineProps<{ gym: DomainGym }>()

const typeColor = computed(() => `var(--color-type-${typeSlug(props.gym.type)})`)
const status = computed(() => {
  if (props.gym.hasBadge) return { label: 'Badge obtenu', kind: 'won' as const }
  if (props.gym.canAttempt) return { label: 'À défier', kind: 'open' as const }
  return { label: 'Tenté · retour lundi', kind: 'locked' as const }
})
</script>

<template>
  <div
    class="tile"
    :class="`tile--${status.kind}`"
    :style="{ '--type': typeColor }"
  >
    <div class="tile__head">
      <!-- Rang dans SON circuit : Johto est numéroté 9-16 côté API. -->
      <span class="tile__order">Arène {{ gym.orderInCircuit }}</span>
      <span class="tile__type">{{ gym.type }}</span>
    </div>

    <div class="tile__badge">
      <img
        :src="gym.badgeImageUrl"
        :alt="gym.badgeName"
        class="tile__badge-img"
        :class="{ 'tile__badge-img--off': !gym.hasBadge }"
        loading="lazy"
      >
      <span
        v-if="gym.hasBadge"
        class="tile__check"
        aria-hidden="true"
      ><UIcon
        name="i-lucide-check"
        class="size-3.5"
      /></span>
    </div>

    <div class="tile__name">
      {{ gym.name }}
    </div>
    <span
      class="tile__status"
      :class="`tile__status--${status.kind}`"
    >{{ status.label }}</span>
  </div>
</template>

<style scoped>
.tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 12px 12px;
  border-radius: 18px;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--type) 16%, var(--ui-bg-elevated)) 0%, var(--ui-bg-elevated) 46%);
  border: 1px solid color-mix(in oklab, var(--type) 30%, var(--ui-border));
  box-shadow: 0 2px 8px rgba(0, 0, 0, .05);
  transition: transform .2s var(--ease-pop), box-shadow .2s ease;
  height: 100%;
}
.tile--won { border-color: color-mix(in oklab, var(--type) 55%, transparent); }
.tile--open { box-shadow: 0 4px 14px color-mix(in oklab, var(--type) 22%, transparent); }

.tile__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  font-family: var(--font-display);
  font-weight: 700;
}
.tile__order { font-size: .74rem; color: var(--ui-text-muted); }
.tile__type {
  font-size: .68rem;
  color: #fff;
  background: var(--type);
  padding: 2px 9px;
  border-radius: 999px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .3);
  text-shadow: 0 1px 1px rgba(0, 0, 0, .18);
}

.tile__badge {
  position: relative;
  width: 74px;
  height: 74px;
  display: grid;
  place-items: center;
  margin: 2px 0;
}
.tile__badge::before {
  content: "";
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 35%, color-mix(in oklab, var(--type) 22%, #fff), color-mix(in oklab, var(--type) 10%, #fff));
  box-shadow: inset 0 0 0 2px color-mix(in oklab, var(--type) 35%, transparent);
}
.tile--won .tile__badge::before { box-shadow: inset 0 0 0 2px var(--type), 0 0 16px color-mix(in oklab, var(--type) 45%, transparent); }
.tile__badge-img {
  position: relative;
  width: 70%;
  height: 70%;
  object-fit: contain;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, .25));
}
.tile__badge-img--off { filter: grayscale(1) opacity(.4); }
.tile__check {
  position: absolute;
  bottom: 2px;
  right: 6px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(150deg, #8fd6a8, #5bbf82);
  color: #fff;
  border: 2px solid var(--ui-bg-elevated);
  box-shadow: 0 2px 5px rgba(60, 140, 90, .45);
}

.tile__name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .84rem;
  text-align: center;
  color: var(--ui-text-highlighted);
  line-height: 1.15;
}
.tile__status {
  font-size: .68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .03em;
  padding: 3px 10px;
  border-radius: 999px;
}
.tile__status--won { color: #3f9e66; background: color-mix(in oklab, #5bbf82 18%, transparent); }
.tile__status--open { color: #fff; background: var(--color-poke-500); box-shadow: 0 2px 0 var(--color-poke-700); }
.tile__status--locked { color: var(--ui-text-dimmed); background: var(--ui-bg-accented); }
</style>
