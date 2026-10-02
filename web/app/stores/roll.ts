import { defineStore } from 'pinia'
import { CACHE_TTL_LONG } from '~/constants/cache'
import type { BiomeInfo, RollOutcome } from '~/types/domain'
import { rollRepo } from '~/repositories'
import { dedupe } from '~/utils/dedupe'
import { BASE_ROLL_COST } from '~/constants/game'

// Ré-exporté pour les consommateurs historiques (Guide).
export { BASE_ROLL_COST }

export const useRollStore = defineStore('roll', {
  state: () => ({
    biomes: [] as BiomeInfo[],
    biomesFetchedAt: 0
  }),

  getters: {
    // Prix du jour du tirage standard : `effective` tient compte des remises
    // d'événement (Soldes −50 %, Journée d'une région −30 %). C'est lui qui est
    // débité ; afficher `base` à sa place rendait le prix faux ces jours-là.
    // La donnée vit dans le store des événements, qui la tient fraîche.
    rollCost: () => useEventsStore().rollCost,
    standardCost(): number { return this.rollCost.effective }
  },

  actions: {
    async ensureBiomes(force = false) {
      if (!force && this.biomes.length && Date.now() - this.biomesFetchedAt < CACHE_TTL_LONG) return
      const [biomes] = await Promise.all([
        dedupe('roll/biomes', () => rollRepo.biomes(useApi())),
        // Sans réponse des événements on garde le tarif de base plutôt que de
        // bloquer le tirage.
        useEventsStore().ensureFresh(force).catch(() => {})
      ])
      this.biomes = biomes
      this.biomesFetchedAt = Date.now()
    },

    costForBiome(biome: string): number {
      if (!biome) return this.standardCost
      return this.biomes.find(b => b.biome === biome)?.effectiveCost ?? this.standardCost
    },

    // Un tirage réel : débit optimiste puis résolution serveur (le solde exact
    // est ré-synchronisé par l'appelant via /auth/me quand nécessaire).
    async perform(biome: string | null, cost: number): Promise<RollOutcome> {
      const wallet = useWalletStore()
      const ref = `roll-${Date.now()}`
      wallet.debitOptimistic(cost, ref)
      try {
        const outcome = await rollRepo.perform(useApi(), biome)
        // Un événement « coins » recrédite ; on confirme le débit dans tous les cas.
        wallet.confirm(ref)
        if (outcome.kind === 'coins') wallet.credit(outcome.amount, 'roll-event')
        return outcome
      } catch (err) {
        wallet.rollback(ref)
        throw err
      }
    },

    // Ouverture « ×N » (le backend n'a pas d'endpoint groupé) : on enchaîne N
    // tirages séquentiels. Chacun débite son propre coût et n'est annulé que s'il
    // échoue — les tirages déjà réussis restent acquis (échec partiel géré par
    // l'appelant, ex. quota atteint en cours de route). Séquentiel = `isNew` fiable
    // (le doublon d'un même tirage renvoie isNew:false au tirage suivant).
    async performBatch(
      biome: string | null,
      unitCost: number,
      count: number
    ): Promise<{ outcomes: RollOutcome[], error: unknown }> {
      const wallet = useWalletStore()
      const outcomes: RollOutcome[] = []
      for (let i = 0; i < count; i++) {
        const ref = `roll-batch-${Date.now()}-${i}`
        wallet.debitOptimistic(unitCost, ref)
        try {
          const outcome = await rollRepo.perform(useApi(), biome)
          wallet.confirm(ref)
          if (outcome.kind === 'coins') wallet.credit(outcome.amount, 'roll-event')
          outcomes.push(outcome)
        } catch (err) {
          wallet.rollback(ref)
          return { outcomes, error: err }
        }
      }
      return { outcomes, error: null }
    },

    previewBatch(count: number, biome: string | null, type: string | null) {
      return rollRepo.previewBatch(useApi(), count, biome, type)
    }
  }
})
