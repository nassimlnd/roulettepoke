<script setup lang="ts">
// PButton — le bouton de l'app : UButton (Nuxt UI) rhabillé « Mochidex »
// (pilule arrondie, police display Fredoka, ombre douce, retour tactile).
//
// Wrapper volontairement fin : il ne redéclare AUCUNE prop de UButton. Toute
// l'API (color/variant/size/icon/label/loading/disabled/to/type…) et tous les
// slots (default/leading/trailing) sont préservés via le fallthrough d'attrs
// et le forwarding des slots. Défauts « primaire plein » surchargeables.
defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
</script>

<template>
  <UButton
    color="primary"
    variant="solid"
    v-bind="attrs"
    :class="[
      'font-display font-semibold rounded-full shadow-sm transition-all duration-150',
      'hover:-translate-y-px hover:shadow-md active:translate-y-0 active:shadow-sm'
    ]"
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
