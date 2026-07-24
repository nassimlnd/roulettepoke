import type { WireTrade, TradeEligibility, WireTradePlayer, WireTradeCard, UUID } from '~/types/api'
import type { DomainTrade, TradePlayer, TradeCard, RealRarity } from '~/types/domain'
import type { Api } from './_client'
import { normalizeTrade, normalizeTradePlayer, normalizeTradeCard } from './normalize'

export const tradesRepo = {
  list: async (api: Api): Promise<DomainTrade[]> => {
    const trades = await api<WireTrade[]>('/trades')
    return trades.map(normalizeTrade)
  },
  eligibility: (api: Api) => api<TradeEligibility>('/trades/eligibility'),
  players: async (api: Api): Promise<TradePlayer[]> => {
    const players = await api<WireTradePlayer[]>('/trades/players')
    return players.map(normalizeTradePlayer)
  },
  playerCards: async (api: Api, playerId: UUID, rarity: RealRarity): Promise<TradeCard[]> => {
    const cards = await api<WireTradeCard[]>(`/trades/players/${playerId}/cards?rarity=${encodeURIComponent(rarity)}`)
    return cards.map(normalizeTradeCard)
  },
  create: (api: Api, targetId: UUID, requestedCardId: UUID) =>
    api('/trades', { method: 'POST', body: { targetId, requestedCardId } }),
  respond: (api: Api, id: UUID, accept: boolean, offeredCardId?: UUID) =>
    api(`/trades/${id}/respond`, { method: 'POST', body: { accept, offeredCardId } }),
  confirm: (api: Api, id: UUID, accept: boolean) =>
    api(`/trades/${id}/confirm`, { method: 'POST', body: { accept } }),
  cancel: (api: Api, id: UUID) => api(`/trades/${id}/cancel`, { method: 'POST' })
}
