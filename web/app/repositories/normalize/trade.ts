// Normalisation des échanges (demandes, partenaires, cartes proposables).
import type { WireTrade, WireTradePlayer, WireTradeCard } from '~/types/api'
import type { DomainTrade, TradePlayer, TradeCard } from '~/types/domain'
import { realRarity } from './card'

export function normalizeTrade(t: WireTrade): DomainTrade {
  return {
    id: t.id,
    status: t.status,
    initiatorId: t.initiator_id,
    initiatorUsername: t.initiator_username,
    targetId: t.target_id,
    targetUsername: t.target_username,
    requested: {
      id: t.requested_card_id ?? null,
      name: t.requested_card_name,
      imageUrl: t.requested_card_image ?? null,
      rarity: realRarity(t.requested_card_rarity)
    },
    offered: t.offered_card_name
      ? {
          id: t.offered_card_id ?? null,
          name: t.offered_card_name,
          imageUrl: t.offered_card_image ?? null,
          rarity: realRarity(t.offered_card_rarity ?? 'Commun')
        }
      : null,
    createdAt: t.created_at,
    completedAt: t.completed_at ?? null
  }
}

export function normalizeTradePlayer(p: WireTradePlayer): TradePlayer {
  return {
    id: p.id,
    username: p.username,
    avatarUrl: p.avatar_url,
    avatarIsShiny: !!p.avatar_is_alt,
    cooldownUntil: p.cooldown_until
  }
}

export function normalizeTradeCard(c: WireTradeCard): TradeCard {
  return {
    id: c.id,
    name: c.name,
    imageUrl: c.image_url,
    rarity: realRarity(c.rarity),
    quantity: c.quantity,
    viewerOwns: c.viewer_owns
  }
}
