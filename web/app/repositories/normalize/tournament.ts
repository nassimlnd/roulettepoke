// Normalisation du tournoi hebdomadaire et de l'analyse « mon équipe ».
import type { WireTournament, WireTournamentSummary, WireMyAnalysis, WireCard } from '~/types/api'
import type { DomainTournament, TournamentSummary, TournamentAnalysis, TournamentSnapshotCard } from '~/types/domain'
import { normalizeChampionMon, normalizeBattleRound } from './battle'
import { realRarity } from './card'

function snapshotCard(c: WireCard): TournamentSnapshotCard {
  return {
    name: c.name,
    type: c.type,
    biome: c.biome ?? null,
    imageUrl: c.image_url,
    isShiny: !!c.is_alt || c.rarity === 'Alt',
    rarity: c.biome === 'Légendaire' ? 'Légendaire' : realRarity(c.rarity)
  }
}

export function normalizeTournament(t: WireTournament): DomainTournament {
  return {
    id: t.id,
    date: t.tournament_date,
    status: t.status,
    prizePool: t.prize_pool,
    weeklyAdvantage: t.weeklyAdvantage ?? null,
    // Les matchs rejouent avec le même journal que les arènes : player1 tient
    // le rôle du « joueur », player2 celui du « champion ».
    matches: (t.matches ?? []).map(m => ({
      round: m.round,
      isBye: !!m.is_bye,
      isThirdPlace: !!m.is_third_place_match || m.round === 0,
      player1Id: m.player1_id ?? null,
      player2Id: m.player2_id ?? null,
      player1Name: m.player1_name ?? '—',
      player2Name: m.player2_name ?? '—',
      winnerId: m.winner_id ?? null,
      rounds: (m.battle_log ?? []).map(normalizeBattleRound)
    })),
    snapshots: Object.fromEntries(
      Object.entries(t.snapshots ?? {}).map(([userId, cards]) => [userId, (cards ?? []).map(snapshotCard)])
    ),
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

export function normalizeTournamentSummary(t: WireTournamentSummary): TournamentSummary {
  return {
    id: t.id,
    date: t.tournament_date,
    status: t.status,
    prizePool: t.prize_pool,
    participantCount: t.participant_count ?? 0
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
