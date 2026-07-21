<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth', public: true })

const schema = z.object({
  username: z.string().min(1, 'Nom d\'utilisateur requis'),
  email: z.string().email('Adresse e-mail invalide'),
  password: z.string().min(8, 'Au moins 8 caractères')
})
type Schema = z.output<typeof schema>

const state = reactive({ username: '', email: '', password: '' })
const loading = ref(false)
const error = ref('')
const auth = useAuthStore()

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  error.value = ''
  try {
    await auth.register(event.data.username, event.data.email, event.data.password)
    await navigateTo('/play')
  } catch (err) {
    error.value = humanizeError(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <PAuthPanel
    title="Rejoins l'aventure !"
    subtitle="Crée ton compte de dresseur."
  >
    <UForm
      :schema="schema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UFormField
        label="Nom d'utilisateur"
        name="username"
      >
        <UInput
          v-model="state.username"
          autocomplete="username"
          icon="i-lucide-user"
          size="lg"
          class="w-full"
          placeholder="TonPseudo"
        />
      </UFormField>
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
      <UFormField
        label="Mot de passe"
        name="password"
        hint="8 caractères minimum"
      >
        <UInput
          v-model="state.password"
          type="password"
          autocomplete="new-password"
          icon="i-lucide-lock"
          size="lg"
          class="w-full"
          placeholder="••••••••"
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
        icon="i-lucide-sparkles"
        :loading="loading"
        class="mt-1 w-full"
      >
        Créer mon compte
      </PButton>
    </UForm>

    <template #footer>
      <p class="text-sm text-muted">
        Déjà un compte ?
        <ULink
          to="/login"
          class="font-semibold text-primary"
        >Se connecter</ULink>
      </p>
    </template>
  </PAuthPanel>
</template>
