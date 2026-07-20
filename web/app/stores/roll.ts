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

    previewBatch(count: number, biome: string | null, type: string | null) {
      return rollRepo.previewBatch(useApi(), count, biome, type)
    }
  }
})
