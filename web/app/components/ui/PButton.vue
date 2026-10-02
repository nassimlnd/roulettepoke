<script setup lang="ts">
// PButton — le bouton de l'app, au style « Mochidex » : rectangle à coins doux,
// remplissage en dégradé (150°), police Fredoka, et surtout une ARÊTE INFÉRIEURE
// PLEINE (box-shadow: 0 Npx 0 <teinte foncée>) qui donne le relief « bonbon » —
// le bouton s'enfonce au clic. Rien à voir avec une pilule plate.
//
// Wrapper fin de UButton (Nuxt UI) : on récupère icônes, spinner de chargement,
// lien (to/href), disabled, type, slots… et on habille par-dessus. Seule la prop
// `color` est interceptée (elle pilote le dégradé) ; tout le reste passe via les
// attrs et le forwarding de slots.
type PColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

const props = withDefaults(defineProps<{ color?: PColor }>(), { color: 'primary' })

defineOptions({ inheritAttrs: false })
const attrs = useAttrs()

// dégradé clair→foncé + arête (teinte plus foncée) + couleur de texte, par rôle.
const RAMP: Record<PColor, { from: string, to: string, edge: string, fg: string }> = {
  primary: { from: '#ee5a48', to: '#dd3322', edge: '#a41f14', fg: '#ffffff' },
  secondary: { from: '#ffd67f', to: '#f4b53c', edge: '#cd8f1e', fg: '#5c3d00' },
  success: { from: '#8fd6a8', to: '#5bbf82', edge: '#3f9e66', fg: '#ffffff' },
  info: { from: '#8fc7f2', to: '#4f9fd6', edge: '#2f79b0', fg: '#ffffff' },
  warning: { from: '#ffc07a', to: '#f59333', edge: '#cc6f16', fg: '#5c3200' },
  error: { from: '#f4796b', to: '#e2402f', edge: '#b02618', fg: '#ffffff' },
  neutral: { from: '#ffffff', to: '#f1f3f6', edge: '#ced3db', fg: '#3d424b' }
}

const vars = computed(() => {
  const c = RAMP[props.color]
  return {
    '--pb-from': c.from,
    '--pb-to': c.to,
    '--pb-edge': c.edge,
    '--pb-fg': c.fg
  }
})
</script>

<template>
  <UButton
    :color="color"
    variant="solid"
    size="lg"
    v-bind="attrs"
    class="pbtn"
    :style="vars"
  >
    <template
      v-for="(_, name) in $slots"
      #[name]="slotProps"
    >
      <slot
        :name="name"
        v-bind="slotProps ?? {}"
      />
    </template>
  </UButton>
</template>

<style scoped>
/* La classe est posée sur la racine de UButton (Vue y ajoute l'attribut de
   scope), d'où une spécificité 0-2-0 qui prime sur les utilitaires Nuxt UI. */
.pbtn {
  --pb-depth: 5px;
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: -0.01em;
  border: none;
  border-radius: 15px;
  background: linear-gradient(150deg, var(--pb-from) 0%, var(--pb-to) 100%);
  color: var(--pb-fg);
  box-shadow: 0 var(--pb-depth) 0 var(--pb-edge), 0 8px 14px -6px color-mix(in oklab, var(--pb-edge) 70%, transparent);
  transition: transform .12s var(--ease-snap), box-shadow .12s var(--ease-snap), filter .15s ease;
}
.pbtn :deep(svg) { filter: drop-shadow(0 1px 0 color-mix(in oklab, var(--pb-edge) 55%, transparent)); }
.pbtn:hover { filter: brightness(1.05); }
.pbtn:active {
  transform: translateY(calc(var(--pb-depth) - 1px));
  box-shadow: 0 1px 0 var(--pb-edge);
}
.pbtn:focus-visible {
  outline: 3px solid color-mix(in oklab, var(--pb-to) 55%, white);
  outline-offset: 2px;
}
.pbtn:disabled,
.pbtn[aria-disabled="true"] {
  transform: none;
  box-shadow: 0 var(--pb-depth) 0 var(--pb-edge);
  filter: saturate(.5) opacity(.6);
  cursor: not-allowed;
}
</style>
