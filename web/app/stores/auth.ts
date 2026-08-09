import { defineStore } from 'pinia'
// Import explicite : useStorage entre en collision avec le useStorage de Nitro
// (stockage serveur) dans les auto-imports.
import { useStorage } from '@vueuse/core'
import type { WireUser, CardChoice, UUID, DailyBonusCorrection } from '~/types/api'
import { authRepo } from '~/repositories'
import { ROUTES } from '~/constants/routes'
import { STORAGE_KEYS } from '~/constants/storage-keys'
import { type Generation, asGeneration } from '~/constants/generation'

// Promesse mémoïsée hors state réactif : un SEUL GET /auth/me par session app
// (l'endpoint crédite le bonus quotidien par effet de bord).
let mePromise: Promise<void> | null = null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    // Même clé que l'ancien front → session partagée pendant la migration.
    token: useStorage<string | null>(STORAGE_KEYS.token, null),
    user: null as WireUser | null,
    rewardClaimed: true,
    pendingChoice: null as CardChoice | null,
    meLoaded: false
  }),

  getters: {
    isAuthenticated: state => !!state.token,
    userId: (state): UUID | null => decodeJwtUserId(state.token),
    // Génération en cours (Kanto/Johto). Le porte-monnaie en fait foi : c'est
    // lui qui la reçoit à chaque réconciliation, y compris avant que /auth/me
    // ait répondu.
    activeGeneration: (): Generation => useWalletStore().activeGeneration
  },

  actions: {
    // `identifier` = e-mail OU pseudo (le serveur accepte les deux).
    async login(identifier: string, password: string) {
      const { user, token } = await authRepo.login(useApi(), { identifier, password })
      this.token = token
      this.user = user
      useWalletStore().reconcileUser(user, 'login')
    },

    async register(username: string, email: string, password: string) {
      const { user, token } = await authRepo.register(useApi(), { username, email, password })
      this.token = token
      this.user = user
      useWalletStore().reconcileUser(user, 'register')
    },

    // Bascule Kanto ↔ Johto : change la bourse dépensée, l'équipe d'arènes et
    // le parcours de badges. Le serveur est la référence — on n'applique le
    // changement localement qu'une fois qu'il a répondu.
    async setActiveGeneration(generation: Generation) {
      const res = await authRepo.setActiveGeneration(useApi(), generation)
      const applied = asGeneration(res.active_generation)
      if (this.user) this.user.active_generation = applied
      useWalletStore().activeGeneration = applied

      // Deux endpoints seulement répondent différemment selon la génération
      // active — vérifié en comparant les réponses des deux côtés : le statut
      // d'entraînement (bonus et solde) et les biomes (coût, cartes possédées).
      // Le reste (/gym, /collection, /team sans portée) est identique, donc on
      // ne le recharge pas.
      useGymStore().refreshTraining()
      useRollStore().ensureBiomes(true).catch(() => {})
      return applied
    },

    // Déplace la prime du jour vers la région active. Le droit se consomme :
    // on éteint le drapeau localement pour que le bouton disparaisse aussitôt,
    // et on resynchronise les deux bourses depuis le serveur.
    async correctDailyBonusGeneration(): Promise<DailyBonusCorrection> {
      const res = await authRepo.correctDailyBonusGeneration(useApi())
      if (this.user) this.user.canCorrectDailyBonusGeneration = false
      await useWalletStore().refreshFromServer('daily-bonus-correction')
      return res
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
        useWalletStore().reconcileUser(user, 'auth/me')
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

    // Compteur de tirages boostés par le Charme Chroma. Mis à jour localement
    // (miroir du serveur) pour un retour immédiat, SANS repasser par /auth/me
    // (dont le GET crédite le bonus quotidien par effet de bord).
    setCharmeRolls(n: number) {
      if (this.user) this.user.charme_chroma_rolls = Math.max(0, n)
    },
    // Le backend ne décrémente le charme que sur un tirage « normal » (jamais sur
    // les événements coins/charme/choix) — on reflète la même règle côté client.
    consumeCharmeRoll() {
      if (this.user && this.user.charme_chroma_rolls > 0) this.user.charme_chroma_rolls -= 1
    },

    logout() {
      this.token = null
      this.user = null
      this.pendingChoice = null
      mePromise = null
      this.meLoaded = false
      navigateTo(ROUTES.login)
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
