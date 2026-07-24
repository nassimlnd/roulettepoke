import type { WireCard, WireOwnedCard, SellResult, UUID } from '~/types/api'
import type { DomainCard, DomainOwnedCard } from '~/types/domain'
import type { Api } from './_client'
import { normalizeCard, normalizeOwnedCard } from './normalize'

export const collectionRepo = {
  mine: async (api: Api): Promise<DomainOwnedCard[]> => {
    const { cards } = await api<{ cards: WireOwnedCard[] }>('/collection')
    return cards.map(normalizeOwnedCard)
  },
  all: async (api: Api): Promise<DomainOwnedCard[]> => {
    const { cards } = await api<{ cards: WireOwnedCard[] }>('/collection/all')
    return cards.map(normalizeOwnedCard)
  },
  sell: (api: Api, cardId: UUID) =>
    api<SellResult>('/collection/sell', { method: 'POST', body: { cardId } })
}

export const mergeRepo = {
  perform: async (api: Api, parentCardId: UUID, currentLevel: number): Promise<DomainCard> => {
    const { card } = await api<{ card: WireCard }>('/merge', { method: 'POST', body: { parentCardId, currentLevel } })
    return normalizeCard(card)
  }
}
