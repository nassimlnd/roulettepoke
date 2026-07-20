import { defineStore } from 'pinia'
// Import explicite : useStorage entre en collision avec le useStorage de Nitro
// (stockage serveur) dans les auto-imports.
import { useStorage } from '@vueuse/core'
import type { WireUser, CardChoice, UUID } from '~/types/api'
import { authRepo } from '~/repositories'

// Décode l'id utilisateur depuis le payload JWT (informatif pour l'UI ;
// l'autorisation réelle reste vérifiée côté serveur).
function decodeUserId(token: string | null): UUID | null {
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    return JSON.parse(atob(payload)).id ?? null
  } catch {
    return null
  }
}

// Promesse mémoïsée hors state réactif : un SEUL GET /auth/me par session app
// (l'endpoint crédite le bonus quotidien par effet de bord).
let mePromise: Promise<void> | null = null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    // Même clé que l'ancien front → session partagée pendant la migration.
    token: useStorage<string | null>('gacha_token', null),
    user: null as WireUser | null,
    rewardClaimed: true,
    pendingChoice: null as CardChoice | null,
    meLoaded: false
  }),

  getters: {
    isAuthenticated: state => !!state.token,
    userId: (state): UUID | null => decodeUserId(state.token)
  },

  actions: {
    async login(email: string, password: string) {
      const { user, token } = await authRepo.login(useApi(), { email, password })
      this.token = token
      this.user = user
      useWalletStore().reconcile(user.coins, 'login')
    },

    async register(username: string, email: string, password: string) {
      const { user, token } = await authRepo.register(useApi(), { username, email, password })
      this.token = token
      this.user = user
      useWalletStore().reconcile(user.coins, 'register')
    },

    // Appelé UNE fois par un plugin d'app après restauration du token.
    fetchMeOnce() {
      if (!mePromise) mePromise = this._fetchMe()
      return mePromise
    },

    async _fetchMe() {
      if (!this.token) return
      try {
        const { user, rewardClaimed, pendingChoice } = await authRepo.me(useApi())
        this.user = user
        this.rewardClaimed = rewardClaimed
        this.pendingChoice = pendingChoice
        this.meLoaded = true
        useWalletStore().reconcile(user.coins, 'auth/me')
      } catch {
        // 401 déjà géré par le plugin (handleSessionExpired) ; sinon on ignore.
      }
    },

    // Ré-arme la promesse mémoïsée (ex. au passage de minuit → nouveau bonus).
    resetMe() {
      mePromise = null
      this.meLoaded = false
    },

    async setAvatar(cardId: UUID) {
      const res = await authRepo.setAvatar(useApi(), cardId)
      if (this.user) {
        this.user.avatar_url = res.avatar_url
        this.user.avatar_is_alt = res.avatar_is_alt
      }
    },

    logout() {
      this.token = null
      this.user = null
      this.pendingChoice = null
      mePromise = null
      this.meLoaded = false
      navigateTo('/login')
    },

    // 401 centralisé (idempotent même si plusieurs requêtes échouent en rafale).
    handleSessionExpired() {
      if (!this.token) return
      this.token = null
      this.user = null
      mePromise = null
      this.meLoaded = false
      const toast = useToast()
      toast.add({ title: 'Session expirée', description: 'Reconnecte-toi pour continuer.', color: 'warning' })
      const route = useRoute()
      navigateTo({ path: '/login', query: { next: route.fullPath } })
    }
  }
})
