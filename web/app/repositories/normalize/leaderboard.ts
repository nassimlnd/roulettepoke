// Normalisation du classement et du flux de shinies récents.
import type { WireLeaderboardRow, WireRecentShiny } from '~/types/api'
import type { LeaderboardRow, RecentShiny } from '~/types/domain'
import { realRarity } from './card'

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
