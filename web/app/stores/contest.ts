import { defineStore } from 'pinia'
import { CACHE_TTL_SHORT } from '~/constants/cache'
import type { DomainContest, ContestSummary, ContestPrizeOption } from '~/types/domain'
import type { UUID } from '~/types/api'
import type { Currency } from '~/constants/generation'
import { contestRepo } from '~/repositories'
import { dedupe } from '~/utils/dedupe'

// Concours hebdomadaire (v5.0) : inscription (10 🪙 dans la bourse choisie, la
// carte quitte la collection), répétition de danse, dévoilement le mardi,
// Légendaire pour le gagnant. Le serveur tient tout l'état ; ce store le
// reflète et enchaîne les appels.
export const useContestStore = defineStore('contest', {
  state: () => ({
    current: null as DomainContest | null,
    fetchedAt: 0,
    history: [] as ContestSummary[],
    historyLoaded: false,
    viewing: null as DomainContest | null
  }),

  getters: {
    registrationOpen: state => state.current?.status === 'registration_open',
    canRegister(): boolean { return this.registrationOpen && !this.current?.isRegistered },
    /** La répétition de danse n'a pas encore été jouée (une seule tentative). */
    dancePending: state =>
      state.current?.status === 'registration_open' && !!state.current.isRegistered && state.current.myDanceScore === null
  },

  actions: {
    async ensureFresh(force = false) {
      if (!force && this.fetchedAt && Date.now() - this.fetchedAt < CACHE_TTL_SHORT) return
      this.current = await dedupe('contest/current', () => contestRepo.current(useApi()))
      this.fetchedAt = Date.now()
    },

    async register(cardId: UUID, currency: Currency) {
      await contestRepo.register(useApi(), cardId, currency)
      // La carte a quitté la collection et la bourse a été débitée.
      useCollectionStore().invalidate()
      await Promise.all([this.ensureFresh(true), useWalletStore().refreshFromServer('contest')])
    },

    // Score envoyé encodé avec la clé du jour. Les refus (déjà soumis, fenêtre
    // fermée) sont silencieux, comme dans le client d'origine : le joueur a
    // joué, le serveur a tranché.
    async submitDance(rounds: number): Promise<boolean> {
      try {
        const { key } = await contestRepo.danceKey(useApi())
        await contestRepo.danceScore(useApi(), rounds + key)
        await this.ensureFresh(true)
        return true
      } catch {
        this.ensureFresh(true).catch(() => {})
        return false
      }
    },

    async loadHistory(force = false) {
      if (this.historyLoaded && !force) return
      this.history = await dedupe('contest/list', () => contestRepo.list(useApi()))
      this.historyLoaded = true
    },

    async view(id: UUID) {
      this.viewing = await contestRepo.byId(useApi(), id)
    },

    prizeOptions(contestId: UUID): Promise<ContestPrizeOption[]> {
      return contestRepo.prizeOptions(useApi(), contestId)
    },

    async claimPrize(contestId: UUID, cardId: UUID) {
      await contestRepo.claimPrize(useApi(), contestId, cardId)
      useCollectionStore().invalidate()
      await this.ensureFresh(true)
      if (this.viewing?.id === contestId) await this.view(contestId)
    }
  }
})
