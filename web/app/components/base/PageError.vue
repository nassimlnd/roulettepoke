<script setup lang="ts">
// Échec de chargement d'une page — AVEC une issue. Auparavant l'erreur
// s'affichait dans une simple alerte : la page devenait un cul-de-sac, le
// joueur n'ayant que le rechargement du navigateur pour s'en sortir.
withDefaults(defineProps<{ message: string, pending?: boolean }>(), { pending: false })
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <PPanel class="perr">
    <UIcon
      name="i-lucide-cloud-off"
      class="perr__ico size-8"
    />
    <p
      class="perr__msg"
      role="alert"
    >
      {{ message }}
    </p>
    <PButton
      color="neutral"
      :loading="pending"
      @click="emit('retry')"
    >
      <UIcon
        name="i-lucide-rotate-ccw"
        class="size-4"
      />
      Réessayer
    </PButton>
  </PPanel>
</template>

<style scoped>
.perr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 30px 18px;
  text-align: center;
}
.perr__ico { color: var(--ui-text-dimmed); }
.perr__msg { color: var(--ui-text-muted); font-size: .92rem; max-width: 42ch; }
</style>
