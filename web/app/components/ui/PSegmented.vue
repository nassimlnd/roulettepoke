<script setup lang="ts" generic="T extends string">
// Segmented control (« choisis-en un »). Source unique : auparavant réécrit
// trois fois sous trois noms — .pills/.pill (collection), .tabs/.tab
// (leaderboard, CSS identique au caractère près) et .seg/.seg__btn (settings,
// variante plus petite et accentuée).
//
//   <PSegmented v-model="tab" :options="[{ value: 'a', label: 'A' }]" />
//
// `tone="accent"` peint l'option active aux couleurs de la marque (préférences),
// sinon elle est simplement surélevée (onglets de contenu).
withDefaults(defineProps<{
  modelValue: T
  options: readonly { value: T, label: string, icon?: string, hint?: string }[]
  size?: 'sm' | 'md'
  tone?: 'neutral' | 'accent'
  // Sémantique d'accessibilité : 'tabs' quand la sélection change le contenu
  // affiché, 'radio' quand elle règle une préférence.
  a11y?: 'tabs' | 'radio'
  ariaLabel?: string
}>(), { size: 'md', tone: 'neutral', a11y: 'tabs' })

const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
</script>

<template>
  <div
    class="seg"
    :class="[`seg--${size}`, `seg--${tone}`]"
    :role="a11y === 'tabs' ? 'tablist' : 'radiogroup'"
    :aria-label="ariaLabel"
  >
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      class="seg__btn"
      :class="{ 'seg__btn--on': modelValue === o.value }"
      :role="a11y === 'tabs' ? 'tab' : 'radio'"
      :aria-selected="a11y === 'tabs' ? modelValue === o.value : undefined"
      :aria-checked="a11y === 'radio' ? modelValue === o.value : undefined"
      :title="o.hint"
      @click="emit('update:modelValue', o.value)"
    >
      <UIcon
        v-if="o.icon"
        :name="o.icon"
        class="size-4"
      />
      {{ o.label }}
    </button>
  </div>
</template>

<style scoped>
.seg {
  display: inline-flex;
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
}
.seg--md { gap: 4px; padding: 4px; border-radius: 14px; }
.seg--sm { gap: 3px; padding: 3px; border-radius: 12px; }

.seg__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-display);
  font-weight: 600;
  border: none;
  background: transparent;
  color: var(--ui-text-muted);
  cursor: pointer;
  transition: color .15s ease, background .15s ease, box-shadow .15s ease;
}
.seg--md .seg__btn { font-size: .9rem; padding: 7px 16px; border-radius: 10px; }
.seg--sm .seg__btn { font-size: .8rem; padding: 6px 12px; border-radius: 9px; }

.seg__btn:not(.seg__btn--on):hover { color: var(--ui-text); }
.seg__btn:focus-visible {
  outline: 2px solid var(--color-poke-400);
  outline-offset: 2px;
}

.seg--neutral .seg__btn--on {
  background: var(--ui-bg-elevated);
  color: var(--ui-text-highlighted);
  box-shadow: 0 2px 7px rgba(0, 0, 0, .1);
}
.seg--accent .seg__btn--on {
  color: #fff;
  background: linear-gradient(150deg, var(--color-poke-400), var(--color-poke-500));
  box-shadow: 0 2px 0 var(--color-poke-700);
}
</style>
