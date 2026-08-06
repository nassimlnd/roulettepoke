import { defineStore } from 'pinia'
import type { WireUser } from '~/types/api'
import { type Generation, DEFAULT_GENERATION, asGeneration } from '~/constants/generation'

interface PendingDebit { ref: string, amount: number }

// Solde unique réconcilié (résout M7 : fini le solde optimiste divergent).
// Règle : le serveur a toujours raison.
//
// Depuis la v4, le joueur possède DEUX bourses (Kanto, Johto) dont une seule
// est active. Le reste de l'application ne connaît toujours qu'un solde — celui
// de la génération active — pour que `canAfford`, les débits optimistes et
// l'affichage restent inchangés. Seul le sélecteur de génération lit `purses`.
export const useWalletStore = defineStore('wallet', {
  state: () => ({
    purses: { 1: null, 2: null } as Record<Generation, number | null>,
    activeGeneration: DEFAULT_GENERATION as Generation,
    lastSync: null as { source: string, at: number } | null,
    pendingDebits: [] as PendingDebit[]
  }),

  getters: {
    // Solde dépensable ici et maintenant : celui de la génération active.
    coins: (state): number | null => state.purses[state.activeGeneration],
    balance(): number | null { return this.coins },
    canAfford() {
      return (cost: number) => this.coins !== null && this.coins >= cost
    }
  },

  actions: {
    // Toute réponse portant un solde ABSOLU appelle reconcile. Le montant reçu
    // concerne toujours la génération active — les endpoints de jeu ne
    // renvoient qu'un `coins` scalaire.
    reconcile(coins: number, source: string) {
      this.pendingDebits = []
      this.purses[this.activeGeneration] = coins
      this.lastSync = { source, at: Date.now() }
    },

    // Réconciliation depuis l'objet utilisateur : lui seul porte les DEUX
    // bourses et la génération active. C'est le point d'entrée à privilégier
    // (login, /auth/me, après un achat) ; il ne peut pas se désynchroniser.
    reconcileUser(user: WireUser, source: string) {
      this.pendingDebits = []
      this.activeGeneration = asGeneration(user.active_generation)
      this.purses[1] = user.coins_gen1
      this.purses[2] = user.coins_gen2
      this.lastSync = { source, at: Date.now() }
    },

    // Un seul appel /auth/me partagé, au lieu des six copies qui traînaient
    // dans les stores et les pages — c'est cette duplication qui a rendu le
    // passage à `coins_gen*` coûteux.
    async refreshFromServer(source: string) {
      try {
        const { user } = await useApi()<{ user: WireUser }>('/auth/me')
        if (user) this.reconcileUser(user, source)
      } catch { /* silencieux : le solde affiché reste le dernier connu */ }
    },

    // Crédit (récompense accordée côté serveur, ex. Aventure) : reflété localement
    // pour un retour immédiat. Le prochain sync absolu (auth/me, hub) réconcilie.
    credit(amount: number, source: string) {
      const cur = this.purses[this.activeGeneration]
      if (cur !== null) this.purses[this.activeGeneration] = cur + amount
      this.lastSync = { source, at: Date.now() }
    },

    // Débit optimiste (roll 10 🪙, retrait 10 🪙, inscription 20 🪙) : affiché
    // immédiatement, confirmé par la réponse serveur ou annulé sur erreur.
    debitOptimistic(amount: number, ref: string) {
      const cur = this.purses[this.activeGeneration]
      if (cur !== null) this.purses[this.activeGeneration] = cur - amount
      this.pendingDebits.push({ ref, amount })
    },

    rollback(ref: string) {
      const idx = this.pendingDebits.findIndex(d => d.ref === ref)
      if (idx !== -1) {
        const [d] = this.pendingDebits.splice(idx, 1)
        const cur = this.purses[this.activeGeneration]
        if (cur !== null && d) this.purses[this.activeGeneration] = cur + d.amount
      }
    },

    confirm(ref: string) {
      this.pendingDebits = this.pendingDebits.filter(d => d.ref !== ref)
    }
  }
})
