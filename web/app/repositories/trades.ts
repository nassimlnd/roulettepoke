import type { WireTrade, TradeEligibility, WireTradePlayer, WireTradeCard, UUID } from '~/types/api'
import type { DomainTrade, TradePlayer, TradeCard, RealRarity } from '~/types/domain'
import type { Generation } from '~/constants/generation'
import type { Api } from './_client'
import { normalizeTrade, normalizeTradePlayer, normalizeTradeCard } from './normalize'

// Les échanges sont cloisonnés par région : deux listes de partenaires et deux
// seuils d'éligibilité distincts, et jamais d'échange entre régions (le front
// d'origine le note explicitement). Sans le paramètre, le serveur répond
// toujours pour Kanto — on affichait donc le seuil de Kanto (120) à un joueur
// de Johto, dont le vrai seuil est 80.
export const tradesRepo = {
  list: async (api: Api): Promise<DomainTrade[]> => {
    const trades = await api<WireTrade[]>('/trades')
    return trades.map(normalizeTrade)
  },
  eligibility: (api: Api, generation: Generation) =>
    api<TradeEligibility>('/trades/eligibility', { query: { generation } }),
  players: async (api: Api, generation: Generation): Promise<TradePlayer[]> => {
    const players = await api<WireTradePlayer[]>('/trades/players', { query: { generation } })
    return players.map(normalizeTradePlayer)
  },
  playerCards: async (api: Api, playerId: UUID, rarity: RealRarity, generation: Generation): Promise<TradeCard[]> => {
    const cards = await api<WireTradeCard[]>(`/trades/players/${playerId}/cards`, {
      query: { generation, rarity }
    })
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
