<script setup lang="ts">
// Tuile de statistique : grand nombre (Fredoka) + intitulé + sous-texte, pastille
// d'icône teintée. Sert aux stats globales et au Spin.
withDefaults(defineProps<{
  icon: string
  value: string | number
  label: string
  sub?: string
  tone?: 'poke' | 'shiny' | 'gold' | 'ocean' | 'leaf'
}>(), { tone: 'poke' })
</script>

<template>
  <div
    class="tile"
    :class="`tile--${tone}`"
  >
    <span class="tile__ico">
      <UIcon
        :name="icon"
        class="size-5"
      />
    </span>
    <p class="tile__value font-display tabular">
      {{ value }}
    </p>
    <p class="tile__label">
      {{ label }}
    </p>
    <p
      v-if="sub"
      class="tile__sub"
    >
      {{ sub }}
    </p>
  </div>
</template>

<style scoped>
.tile {
  --accent: var(--color-poke-500);
  --wash: var(--color-poke-50);
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 16px 18px;
  border-radius: 18px;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  box-shadow: 0 8px 22px -16px rgba(60, 40, 40, .2);
}
.tile--poke { --accent: var(--color-poke-500); --wash: var(--color-poke-50); }
.tile--shiny { --accent: #a684ff; --wash: color-mix(in oklab, #c9b3ff 24%, transparent); }
.tile--gold { --accent: #c98a1a; --wash: color-mix(in oklab, #f6c453 26%, transparent); }
.tile--ocean { --accent: #4e9bd0; --wash: color-mix(in oklab, #8fc7ec 26%, transparent); }
.tile--leaf { --accent: #5bbf82; --wash: color-mix(in oklab, #8fd6a8 26%, transparent); }
.tile__ico {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  margin-bottom: 6px;
  color: var(--accent);
  background: var(--wash);
}
.tile__value { font-weight: 800; font-size: 1.7rem; line-height: 1.05; color: var(--ui-text-highlighted); }
.tile__label { font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--ui-text-muted); }
.tile__sub { font-size: .76rem; color: var(--ui-text-dimmed); margin-top: 2px; }
</style>
