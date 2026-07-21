// Réconciliation des formes « wire » de l'API en types domaine.
// Notamment : la rareté 'Alt' (shiny dans /collection) → isShiny + rareté réelle.

import type { WireCard, WireOwnedCard, WireTeamMember, Rarity } from '~/types/api'
import type { DomainCard, DomainOwnedCard, TeamMember, RealRarity } from '~/types/domain'

// La rareté réelle d'une carte, en réconciliant 'Alt'. Un shiny garde la
// rareté de sa version standard (Commun par défaut si non déductible).
function realRarity(rarity: Rarity): RealRarity {
  if (rarity === 'Alt') return 'Commun'
  return rarity
}

export function normalizeCard(c: WireCard): DomainCard {
  const isShiny = c.is_alt || c.rarity === 'Alt'
  // Un légendaire se reconnaît au biome 'Légendaire' même si sa rareté wire varie.
  const rarity: RealRarity = c.biome === 'Légendaire' ? 'Légendaire' : realRarity(c.rarity)
  return {
    id: c.id,
    num: c.num,
    name: c.name,
    imageUrl: c.image_url,
    rarity,
    isShiny,
    level: c.level,
    biome: c.biome,
    type: c.type,
    parentCardId: c.parent_card_id,
    standardId: c.standard_id ?? null
  }
}

export function normalizeOwnedCard(c: WireOwnedCard): DomainOwnedCard {
  return {
    ...normalizeCard(c),
    quantity: c.quantity ?? 0,
    owned: c.owned,
    obtainedAt: c.obtained_at
  }
}

export function normalizeTeamMember(m: WireTeamMember): TeamMember {
  const isShiny = m.rarity === 'Alt'
  return {
    teamEntryId: m.team_entry_id,
    position: m.position,
    cardId: m.id,
    name: m.name,
    type: m.type,
    rarity: realRarity(m.rarity),
    isShiny,
    imageUrl: m.image_url,
    typeImageUrl: m.type_image_url ?? null
  }
}
