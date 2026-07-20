<script setup lang="ts">
// Confirmation réutilisable (résout C5 : friction alignée sur le risque).
// Nuxt UI (UModal) fournit focus trap + Escape + role=dialog.
const open = defineModel<boolean>('open', { required: true })

const props = withDefaults(defineProps<{
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
}>(), {
  confirmLabel: 'Confirmer',
  cancelLabel: 'Annuler',
  danger: false
})

const emit = defineEmits<{ confirm: [] }>()
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :ui="{ footer: 'justify-end gap-2' }"
  >
    <template #body>
      <p
        v-if="message"
        class="text-sm text-muted"
      >
        {{ message }}
      </p>
      <slot />
    </template>
    <template #footer>
      <UButton
        :label="props.cancelLabel"
        color="neutral"
        variant="ghost"
        @click="open = false"
      />
      <UButton
        :label="props.confirmLabel"
        :color="props.danger ? 'warning' : 'primary'"
        :loading="props.loading"
        @click="emit('confirm')"
      />
    </template>
  </UModal>
</template>
