<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { authRepo } from '~/repositories'

definePageMeta({ layout: 'auth', public: true })

const schema = z.object({ email: z.string().email('Adresse e-mail invalide') })
type Schema = z.output<typeof schema>

const state = reactive({ email: '' })
const loading = ref(false)
const sent = ref(false)
const error = ref('')

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  error.value = ''
  try {
    await authRepo.forgotPassword(useApi(), event.data.email)
    sent.value = true
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
        Mot de passe oublié
      </h1>
    </template>

    <UAlert
      v-if="sent"
      color="success"
      variant="soft"
      title="E-mail envoyé"
      description="Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé."
      icon="i-lucide-mail-check"
    />
    <UForm
      v-else
      :schema="schema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UFormField
        label="Adresse e-mail"
        name="email"
      >
        <UInput
          v-model="state.email"
          type="email"
          autocomplete="email"
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
        label="Envoyer le lien"
      />
    </UForm>

    <template #footer>
      <p class="text-center text-sm text-muted">
        <ULink
          to="/login"
          class="text-primary"
        >Retour à la connexion</ULink>
      </p>
    </template>
  </UCard>
</template>
