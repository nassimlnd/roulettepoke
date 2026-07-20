<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { authRepo } from '~/repositories'

definePageMeta({ layout: 'auth', public: true })

const route = useRoute()
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

const schema = z.object({ password: z.string().min(8, 'Au moins 8 caractères') })
type Schema = z.output<typeof schema>

const state = reactive({ password: '' })
const loading = ref(false)
const done = ref(false)
const error = ref('')

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!token.value) {
    error.value = 'Lien de réinitialisation invalide ou expiré.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await authRepo.resetPassword(useApi(), token.value, event.data.password)
    done.value = true
  } catch (err) {
    error.value = humanizeError(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h1 class="font-display text-2xl font-extrabold">
        Nouveau mot de passe
      </h1>
    </template>

    <UAlert
      v-if="done"
      color="success"
      variant="soft"
      title="Mot de passe mis à jour"
      icon="i-lucide-check"
    >
      <template #description>
        Tu peux maintenant <ULink
          to="/login"
          class="text-primary underline"
        >te connecter</ULink>.
      </template>
    </UAlert>
    <UForm
      v-else
      :schema="schema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UFormField
        label="Nouveau mot de passe"
        name="password"
        hint="8 caractères minimum"
      >
        <UInput
          v-model="state.password"
          type="password"
          autocomplete="new-password"
          class="w-full"
        />
      </UFormField>
      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        :title="error"
        icon="i-lucide-triangle-alert"
      />
      <UButton
        type="submit"
        block
        :loading="loading"
        label="Réinitialiser"
      />
    </UForm>
  </UCard>
</template>
