<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { ROUTES } from '~/constants/routes'

definePageMeta({ layout: 'auth', public: true })

// Le serveur accepte l'e-mail OU le pseudo sur un unique champ `identifier` —
// valider une adresse e-mail ici rejetterait les connexions par pseudo.
const schema = z.object({
  identifier: z.string().min(1, 'Identifiant requis'),
  password: z.string().min(1, 'Mot de passe requis')
})
type Schema = z.output<typeof schema>

const state = reactive({ identifier: '', password: '' })
const loading = ref(false)
const error = ref('')

const auth = useAuthStore()
const route = useRoute()

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  error.value = ''
  try {
    await auth.login(event.data.identifier, event.data.password)
    const next = typeof route.query.next === 'string' ? route.query.next : ROUTES.home
    await navigateTo(next)
  } catch (err) {
    error.value = humanizeError(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <PAuthPanel
    title="Content de te revoir !"
    subtitle="Connecte-toi pour continuer l'aventure."
  >
    <UForm
      :schema="schema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UFormField
        label="E-mail ou nom d'utilisateur"
        name="identifier"
      >
        <UInput
          v-model="state.identifier"
          type="text"
          autocomplete="username"
          icon="i-lucide-user"
          size="lg"
          class="w-full"
          placeholder="toi@exemple.fr ou ton pseudo"
        />
      </UFormField>
      <UFormField
        label="Mot de passe"
        name="password"
      >
        <UInput
          v-model="state.password"
          type="password"
          autocomplete="current-password"
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
        icon="i-lucide-log-in"
        :loading="loading"
        class="mt-1 w-full"
      >
        Se connecter
      </PButton>
    </UForm>

    <template #footer>
      <div class="space-y-1.5 text-sm text-muted">
        <p>
          Pas encore de compte ?
          <ULink
            to="/register"
            class="font-semibold text-primary"
          >S'inscrire</ULink>
        </p>
        <p>
          <ULink
            to="/forgot-password"
            class="text-primary"
          >Mot de passe oublié ?</ULink>
        </p>
      </div>
    </template>
  </PAuthPanel>
</template>
