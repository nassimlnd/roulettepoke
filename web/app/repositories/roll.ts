import type { WireCard, WireBiome, WireRollResult, UUID } from '~/types/api'
import type { DomainCard, RollOutcome, BiomeInfo } from '~/types/domain'
import type { Api } from './_client'
import { normalizeCard } from './normalize'

function normalizeRoll(r: WireRollResult): RollOutcome {
  if ('isSpecialEvent' in r) {
    if (r.eventType === 'coins') return { kind: 'coins', amount: r.amount, rollCost: r.rollCost }
    if (r.eventType === 'charme_chroma') return { kind: 'charme', rollCost: r.rollCost }
    return {
      kind: 'choice',
      choiceId: r.choiceId,
      left: normalizeCard(r.leftCard),
      right: normalizeCard(r.rightCard),
      rollCost: r.rollCost
    }
  }
  return { kind: 'card', card: normalizeCard(r), isNew: r.isNew, rollCost: r.rollCost }
}

export const rollRepo = {
  biomes: async (api: Api): Promise<BiomeInfo[]> => {
    const { biomes } = await api<{ biomes: WireBiome[] }>('/roll/biomes')
    return biomes.map(b => ({ biome: b.biome, cardCount: b.card_count, cost: b.cost, ownedCount: b.owned_count }))
  },
  perform: async (api: Api, biome: string | null): Promise<RollOutcome> => {
    const res = await api<{ card: WireRollResult }>('/roll', {
      method: 'POST',
      body: biome ? { biome } : {}
    })
    return normalizeRoll(res.card)
  },
  previewBatch: async (api: Api, count = 19, biome: string | null = null, type: string | null = null): Promise<DomainCard[]> => {
    const params = new URLSearchParams({ count: String(count) })
    if (biome) params.set('biome', biome)
    if (type) params.set('type', type)
    const { cards } = await api<{ cards: WireCard[] }>(`/roll/preview-batch?${params}`)
    return cards.map(normalizeCard)
  },
  comboCheck: (api: Api, biome: string | null, type: string | null) => {
    const params = new URLSearchParams()
    if (biome) params.set('biome', biome)
    if (type) params.set('type', type)
    return api<{ available: boolean }>(`/roll/combo-check?${params}`)
  }
}

// Événement « choix de carte » (résolution d'un tirage card_choice).
export const eventRepo = {
  confirmCardChoice: async (api: Api, choiceId: UUID, cardId: UUID) => {
    const { card } = await api<{ card: WireCard & { isNew?: boolean } }>('/event/card-choice', {
      method: 'POST',
      body: { choiceId, cardId }
    })
    return { card: normalizeCard(card), isNew: !!card.isNew }
  }
}
