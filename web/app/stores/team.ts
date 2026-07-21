import { defineStore } from 'pinia'
import type { TeamMember } from '~/types/domain'
import type { UUID } from '~/types/api'
import { teamRepo } from '~/repositories'
import { dedupe } from '~/utils/dedupe'

const TTL = 60_000
export const TEAM_MAX = 6
export const REMOVE_COST = 10 // 🪙 — coût du retrait d'un membre (définitif)

export const useTeamStore = defineStore('team', {
  state: () => ({
    members: [] as TeamMember[],
    fetchedAt: 0
  }),

  getters: {
    sorted: state => [...state.members].sort((a, b) => a.position - b.position),
    count: state => state.members.length,
    isFull: state => state.members.length >= TEAM_MAX,
    isEmpty: state => state.members.length === 0
  },

  actions: {
    async ensureFresh(force = false) {
      if (!force && this.members.length && Date.now() - this.fetchedAt < TTL) return
      this.members = await dedupe('team/mine', () => teamRepo.get(useApi()))
      this.fetchedAt = Date.now()
    },

    invalidate() {
      this.fetchedAt = 0
    },

    // Roulette d'équipe : pioche destructive dans la collection (hors
    // Légendaires/Shiny). Retourne le membre tiré ; l'appelant le révèle.
    async roll(): Promise<TeamMember> {
      const member = await teamRepo.roll(useApi())
      this.invalidate()
      await this.ensureFresh(true)
      useCollectionStore().invalidate() // la carte a quitté la collection
      return member
    },

    // Retrait d'un membre : coûte REMOVE_COST 🪙, définitif (ne revient pas
    // en collection). Le solde est resynchronisé via /auth/me.
    async remove(teamEntryId: UUID) {
      await teamRepo.remove(useApi(), teamEntryId)
      this.invalidate()
      await this.ensureFresh(true)
      await this.refreshBalance()
    },

    async clear() {
      await teamRepo.clear(useApi())
      this.invalidate()
      await this.ensureFresh(true)
    },

    async swap(a: TeamMember, b: TeamMember) {
      await teamRepo.swap(useApi(), a.teamEntryId, b.teamEntryId)
      this.invalidate()
      await this.ensureFresh(true)
    },

    async refreshBalance() {
      try {
        const { user } = await useApi()<{ user: { coins: number } }>('/auth/me')
        if (user) useWalletStore().reconcile(user.coins, 'team')
      } catch { /* silencieux */ }
    }
  }
})
