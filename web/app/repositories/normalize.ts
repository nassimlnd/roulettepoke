// Réconciliation des formes « wire » de l'API en types domaine.
// Notamment : la rareté 'Alt' (shiny dans /collection) → isShiny + rareté réelle.

import type {
  WireCard, WireOwnedCard, WireTeamMember, WireLeaderboardRow, WireRecentShiny,
  WireGym, WireGymDetail, WireGymEstimate, WireBattleRound, WireBattleResult, WireTrainingResult,
  WireLineResult, WireSpinResult, WireRecentWin, WireChampionMon, WireTournament, WireMyAnalysis,
  WireTrade, WireTradePlayer, WireTradeCard, Rarity
} from '~/types/api'
import type {
  DomainCard, DomainOwnedCard, TeamMember, LeaderboardRow, RecentShiny,
  DomainGym, GymDetail, GymEstimate, BattleRound, BattleResult, TrainingOutcome,
  LineReward, SpinResult, RecentWin, ChampionMon, DomainTournament, TournamentAnalysis,
  DomainTrade, TradePlayer, TradeCard, RealRarity
} from '~/types/domain'

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

function normalizeLineReward(r: WireLineResult): LineReward {
  switch (r.type) {
    case 'coins': return { line: r.line, type: 'coins', amount: r.amount }
    case 'charme': return { line: r.line, type: 'charme' }
    case 'biome_ticket': return { line: r.line, type: 'biome_ticket', biome: r.biome }
    case 'type_ticket': return { line: r.line, type: 'type_ticket', typeName: r.typeName }
    case 'legendary': return { line: r.line, type: 'legendary', card: normalizeCard(r.card) }
    default: return { line: r.line, type: 'nothing' }
  }
}

export function normalizeSpinResult(w: WireSpinResult): SpinResult {
  return {
    cells: w.cells,
    lines: (w.lineResults ?? []).map(normalizeLineReward),
    cost: w.cost,
    newCoins: w.newCoins
  }
}

export function normalizeRecentWin(w: WireRecentWin): RecentWin {
  return {
    username: w.username,
    prizes: (w.prizes ?? []).map(normalizeLineReward),
    spunAt: w.spun_at
  }
}

export function normalizeGym(g: WireGym): DomainGym {
  return {
    id: g.id,
    order: g.order_num,
    name: g.name,
    type: g.type,
    badgeName: g.badge_name,
    badgeImageUrl: g.badge_image_url,
    badgeObtainedAt: g.badge_obtained_at,
    hasBadge: g.has_badge,
    canAttempt: g.can_attempt,
    lastAttemptThisWeek: g.last_attempt_this_week
  }
}

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

export function normalizeChampionMon(c: WireChampionMon): ChampionMon {
  return {
    position: c.position,
    name: c.name,
    type: c.type,
    rarity: realRarity(c.rarity),
    isShiny: c.rarity === 'Alt',
    imageUrl: c.image_url
  }
}

export function normalizeGymDetail(d: WireGymDetail): GymDetail {
  return {
    id: d.id,
    typeColor: d.type_color,
    typeImageUrl: d.type_image_url,
    champions: (d.champion_team ?? []).map(normalizeChampionMon),
    recommendedTypes: (d.recommended_types ?? []).map(t => ({ name: t.name, imageUrl: t.image_url, color: t.color }))
  }
}

export function normalizeTournament(t: WireTournament): DomainTournament {
  return {
    id: t.id,
    date: t.tournament_date,
    status: t.status,
    prizePool: t.prize_pool,
    participants: (t.participants ?? []).map(p => ({
      userId: p.user_id,
      username: p.username,
      avatarUrl: p.avatar_url,
      avatarIsShiny: !!p.avatar_is_alt
    })),
    isRegistered: !!t.is_registered,
    teamsAreLocked: !!t.teamsAreLocked,
    results: (t.results ?? []).map(r => ({
      placement: r.placement,
      username: r.username,
      prize: r.prize,
      avatarUrl: r.avatar_url,
      avatarIsShiny: !!r.avatar_is_alt
    }))
  }
}

export function normalizeTournamentAnalysis(a: WireMyAnalysis): TournamentAnalysis {
  return {
    myTeam: (a.myTeam ?? []).map(normalizeChampionMon),
    myTeamLocked: a.myTeamIsLocked,
    teamsLocked: a.teamsAreLocked,
    hasOpponents: a.hasOpponents,
    strong: (a.analysis?.strongPokemon ?? []).map(normalizeChampionMon),
    weak: (a.analysis?.weakPokemon ?? []).map(normalizeChampionMon),
    matchups: (a.matchups ?? []).map(m => ({
      username: m.username,
      avatarUrl: m.avatar_url,
      avatarIsShiny: !!m.avatar_is_alt,
      team: (m.team ?? []).map(normalizeChampionMon),
      winProbability: m.winProbability,
      oppWinProbability: m.oppWinProbability
    })),
    toPrivilege: a.typeRecommendations?.toPrivilege ?? [],
    toAvoid: a.typeRecommendations?.toAvoid ?? []
  }
}

export function normalizeGymEstimate(e: WireGymEstimate): GymEstimate {
  return {
    winProbability: e.estimated_win_probability,
    trainingBonus: e.training_bonus ?? 0,
    matchups: e.matchups ?? []
  }
}

function normalizeBattleRound(r: WireBattleRound): BattleRound {
  return {
    round: r.round,
    player: { name: r.player_pokemon.name, imageUrl: r.player_pokemon.image_url ?? null },
    champion: { name: r.champion_pokemon.name, imageUrl: r.champion_pokemon.image_url ?? null },
    winProbability: r.win_probability,
    playerWon: r.player_wins_duel
  }
}

export function normalizeBattleResult(b: WireBattleResult): BattleResult {
  return {
    won: b.won,
    badgeName: b.badge_name ?? null,
    rounds: (b.log ?? []).map(normalizeBattleRound)
  }
}

export function normalizeTrainingOutcome(t: WireTrainingResult): TrainingOutcome {
  return {
    won: t.won,
    coinsGained: t.coins_gained ?? 0,
    newBonus: t.new_bonus,
    rounds: (t.log ?? []).map(normalizeBattleRound)
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
