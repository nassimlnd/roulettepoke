// Réconciliation des formes « wire » de l'API en types domaine.
// Notamment : la rareté 'Alt' (shiny dans /collection) → isShiny + rareté réelle.

import type { WireCard, WireOwnedCard, WireTeamMember, WireLeaderboardRow, WireRecentShiny, Rarity } from '~/types/api'
import type { DomainCard, DomainOwnedCard, TeamMember, LeaderboardRow, RecentShiny, RealRarity } from '~/types/domain'

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

export function normalizeLeaderboardRow(r: WireLeaderboardRow): LeaderboardRow {
  return {
    rank: r.rank,
    username: r.username,
    avatarUrl: r.avatar_url,
    avatarRarity: r.avatar_rarity ? realRarity(r.avatar_rarity) : null,
    isShinyAvatar: !!r.avatar_is_alt || r.avatar_rarity === 'Alt',
    crowned: r.crowned,
    medal: r.tournament_medal_placement,
    standardCount: r.standard_count,
    legendaryCount: r.legendary_count,
    shinyCount: r.shiny_count,
    score: r.score,
    badges: (r.badges ?? []).map(b => ({ imageUrl: b.image_url, name: b.name }))
  }
}

export function normalizeRecentShiny(s: WireRecentShiny): RecentShiny {
  return {
    username: s.username,
    name: s.name,
    imageUrl: s.image_url,
    isShiny: s.is_alt,
    rarity: realRarity(s.rarity),
    rolledAt: s.rolled_at,
    isDuplicate: s.is_duplicate,
    source: s.source
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
