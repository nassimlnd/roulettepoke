import { defineStore } from 'pinia'

interface PendingDebit { ref: string, amount: number }

// Solde unique réconcilié (résout M7 : fini le solde optimiste divergent).
// Règle : le serveur a toujours raison.
export const useWalletStore = defineStore('wallet', {
  state: () => ({
    coins: null as number | null,
    lastSync: null as { source: string, at: number } | null,
    pendingDebits: [] as PendingDebit[]
  }),

  getters: {
    balance: (state): number | null => state.coins,
    canAfford: state => (cost: number) => state.coins !== null && state.coins >= cost
  },

  actions: {
    // Toute réponse portant un solde ABSOLU appelle reconcile.
    reconcile(coins: number, source: string) {
      this.pendingDebits = []
      this.coins = coins
      this.lastSync = { source, at: Date.now() }
    },

    // Débit optimiste (roll 10 🪙, retrait 10 🪙, inscription 20 🪙) : affiché
    // immédiatement, confirmé par la réponse serveur ou annulé sur erreur.
    debitOptimistic(amount: number, ref: string) {
      if (this.coins !== null) this.coins -= amount
      this.pendingDebits.push({ ref, amount })
    },

    rollback(ref: string) {
      const idx = this.pendingDebits.findIndex(d => d.ref === ref)
      if (idx !== -1) {
        const [d] = this.pendingDebits.splice(idx, 1)
        if (this.coins !== null && d) this.coins += d.amount
      }
    },

    confirm(ref: string) {
      this.pendingDebits = this.pendingDebits.filter(d => d.ref !== ref)
    }
  }
})
