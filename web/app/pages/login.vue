<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth', public: true })

const schema = z.object({
  email: z.string().email('Adresse e-mail invalide'),
  password: z.string().min(1, 'Mot de passe requis')
})
type Schema = z.output<typeof schema>

const state = reactive({ email: '', password: '' })
const loading = ref(false)
const error = ref('')

const auth = useAuthStore()
const route = useRoute()

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  error.value = ''
  try {
    await auth.login(event.data.email, event.data.password)
    const next = typeof route.query.next === 'string' ? route.query.next : '/play'
    await navigateTo(next)
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
      <h1 class="flex items-center gap-2 font-display text-2xl font-extrabold">
        <UIcon
          name="i-lucide-dices"
          class="size-6 text-primary"
        />
        Connexion
      </h1>
    </template>

    <UForm
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
          placeholder="toi@exemple.fr"
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
        label="Se connecter"
      />
    </UForm>

    <template #footer>
      <div class="space-y-1 text-center text-sm text-muted">
        <p>
          Pas encore de compte ? <ULink
            to="/register"
            class="text-primary"
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
  </UCard>
</template>
