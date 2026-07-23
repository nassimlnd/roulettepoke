import { defineStore } from 'pinia'
import type { BiomeInfo, RollOutcome } from '~/types/domain'
import { rollRepo } from '~/repositories'
import { dedupe } from '~/utils/dedupe'

// Coût de base d'un tirage standard (sans filtre biome).
export const BASE_ROLL_COST = 10

export const useRollStore = defineStore('roll', {
  state: () => ({
    biomes: [] as BiomeInfo[],
    biomesFetchedAt: 0
  }),

  actions: {
    async ensureBiomes(force = false) {
      if (!force && this.biomes.length && Date.now() - this.biomesFetchedAt < 5 * 60_000) return
      this.biomes = await dedupe('roll/biomes', () => rollRepo.biomes(useApi()))
      this.biomesFetchedAt = Date.now()
    },

    costForBiome(biome: string): number {
      if (!biome) return BASE_ROLL_COST
      return this.biomes.find(b => b.biome === biome)?.cost ?? BASE_ROLL_COST
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
        if (outcome.kind === 'coins' && wallet.coins !== null) {
          wallet.coins += outcome.amount
        }
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
          if (outcome.kind === 'coins' && wallet.coins !== null) {
            wallet.coins += outcome.amount
          }
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
