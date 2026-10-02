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
  <PAuthPanel
    title="Mot de passe oublié ?"
    subtitle="On t'envoie un lien de réinitialisation."
  >
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
          icon="i-lucide-mail"
          size="lg"
          class="w-full"
          placeholder="toi@exemple.fr"
        />
      </UFormField>
      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        :title="error"
        icon="i-lucide-triangle-alert"
      />
      <PButton
        type="submit"
        block
        icon="i-lucide-send"
        :loading="loading"
        class="mt-1 w-full"
      >
        Envoyer le lien
      </PButton>
    </UForm>

    <template #footer>
      <p class="text-sm text-muted">
        <ULink
          to="/login"
          class="text-primary"
        >Retour à la connexion</ULink>
      </p>
    </template>
  </PAuthPanel>
</template>
