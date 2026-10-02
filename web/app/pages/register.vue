<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth', public: true })

// Depuis la 4.1.0 l'inscription ne connecte plus : le serveur crée le compte,
// envoie un e-mail de vérification et ne renvoie qu'un message. Attendre un
// jeton ici affichait une erreur… alors que le compte existait déjà.
const schema = z.object({
  username: z.string().min(3, 'Au moins 3 caractères').max(30, 'Au plus 30 caractères')
    .regex(/^[\w-]+$/, 'Lettres, chiffres, _ ou - uniquement'),
  email: z.string().email('Adresse e-mail invalide'),
  password: z.string().min(8, 'Au moins 8 caractères')
})
type Schema = z.output<typeof schema>

const state = reactive({ username: '', email: '', password: '' })
const loading = ref(false)
const error = ref('')
// Message de confirmation du serveur : une fois présent, le formulaire laisse
// place à la consigne « vérifie ta boîte mail ».
const created = ref('')
const auth = useAuthStore()
const toast = useToast()

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  error.value = ''
  try {
    const message = await auth.register(event.data.username, event.data.email, event.data.password)
    created.value = message || 'Compte créé. Vérifie ta boîte mail pour l\'activer.'
  } catch (err) {
    error.value = humanizeError(err)
  } finally {
    loading.value = false
  }
}

const resending = ref(false)
async function resend() {
  if (resending.value) return
  resending.value = true
  try {
    const { message } = await auth.resendVerification(state.email)
    toast.add({ title: message || 'E-mail renvoyé.', color: 'success', icon: 'i-lucide-mail-check' })
  } catch (err) {
    toast.add({ title: humanizeError(err), color: 'error' })
  } finally {
    resending.value = false
  }
}
</script>

<template>
  <PAuthPanel
    :title="created ? 'Presque là !' : 'Rejoins l\'aventure !'"
    :subtitle="created ? 'Il reste une étape.' : 'Crée ton compte de dresseur.'"
  >
    <!-- Compte créé : consigne et renvoi du lien -->
    <div
      v-if="created"
      class="done"
    >
      <span class="done__icon">
        <UIcon
          name="i-lucide-mail-check"
          class="size-7"
        />
      </span>
      <p class="done__msg">
        {{ created }}
      </p>
      <p class="done__sub">
        Le lien de vérification a été envoyé à <strong>{{ state.email }}</strong>.
        Pense à regarder dans les indésirables.
      </p>
      <PButton
        color="neutral"
        icon="i-lucide-refresh-cw"
        :loading="resending"
        @click="resend"
      >
        Renvoyer l'e-mail
      </PButton>
    </div>

    <UForm
      v-else
      :schema="schema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UFormField
        label="Nom d'utilisateur"
        name="username"
        hint="3 à 30 caractères"
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
        hint="Un lien de vérification y sera envoyé"
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
        {{ created ? 'E-mail vérifié ?' : 'Déjà un compte ?' }}
        <ULink
          to="/login"
          class="font-semibold text-primary"
        >Se connecter</ULink>
      </p>
    </template>
  </PAuthPanel>
</template>

<style scoped>
.done {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  padding: 6px 0 4px;
}
.done__icon {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  color: #3f9e66;
  background: color-mix(in oklab, #5bbf82 20%, transparent);
}
.done__msg { font-family: var(--font-display); font-weight: 700; font-size: 1.05rem; margin: 0; }
.done__sub { margin: 0; color: var(--ui-text-muted); font-size: .88rem; line-height: 1.4; max-width: 34ch; overflow-wrap: anywhere; }
</style>
