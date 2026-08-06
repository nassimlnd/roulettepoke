import { defineStore } from 'pinia'
import { CACHE_TTL_SHORT } from '~/constants/cache'
import type { TeamMember } from '~/types/domain'
import type { UUID } from '~/types/api'
import { teamRepo } from '~/repositories'
import { dedupe } from '~/utils/dedupe'
import type { TeamScope } from '~/constants/generation'

const TTL = CACHE_TTL_SHORT
export const TEAM_MAX = 6
export const REMOVE_COST = 10 // 🪙 — coût du retrait d'un membre (définitif)

const EMPTY = (): Record<TeamScope, TeamMember[]> => ({ global: [], gen1: [], gen2: [] })
const NEVER = (): Record<TeamScope, number> => ({ global: 0, gen1: 0, gen2: 0 })

// Depuis la v4 le joueur entretient TROIS équipes : celle du Tournoi (et de la
// Ligue), celle des arènes de Kanto, celle des arènes de Johto. On les garde en
// cache séparément — passer d'un onglet à l'autre ne doit pas rejouer une
// requête, et surtout les rosters ne doivent jamais se mélanger.
export const useTeamStore = defineStore('team', {
  state: () => ({
    rosters: EMPTY(),
    fetchedAt: NEVER(),
    // Portée affichée par la page Équipe. Ce store n'a pas d'autre consommateur,
    // donc cet état d'affichage peut vivre ici sans risque de collision.
    scope: 'global' as TeamScope
  }),

  getters: {
    members: (state): TeamMember[] => state.rosters[state.scope],
    sorted(): TeamMember[] {
      return [...this.members].sort((a, b) => a.position - b.position)
    },
    count(): number { return this.members.length },
    isFull(): boolean { return this.members.length >= TEAM_MAX },
    isEmpty(): boolean { return this.members.length === 0 }
  },

  actions: {
    async ensureFresh(force = false) {
      const scope = this.scope
      if (!force && this.rosters[scope].length && Date.now() - this.fetchedAt[scope] < TTL) return
      this.rosters[scope] = await dedupe(`team/${scope}`, () => teamRepo.get(useApi(), scope))
      this.fetchedAt[scope] = Date.now()
    },

    async setScope(scope: TeamScope) {
      if (scope === this.scope) return
      this.scope = scope
      await this.ensureFresh()
    },

    invalidate() {
      this.fetchedAt[this.scope] = 0
    },

    // Roulette d'équipe : pioche destructive dans la collection (hors
    // Légendaires/Shiny). Retourne le membre tiré ; l'appelant le révèle.
    async roll(): Promise<TeamMember> {
      const member = await teamRepo.roll(useApi(), this.scope)
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
      await teamRepo.clear(useApi(), this.scope)
      this.invalidate()
      await this.ensureFresh(true)
    },

    async swap(a: TeamMember, b: TeamMember) {
      await teamRepo.swap(useApi(), a.teamEntryId, b.teamEntryId)
      this.invalidate()
      await this.ensureFresh(true)
    },

    refreshBalance() {
      return useWalletStore().refreshFromServer('team')
    }
  }
})
