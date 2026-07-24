// Normalisation du tournoi hebdomadaire et de l'analyse « mon équipe ».
import type { WireTournament, WireMyAnalysis } from '~/types/api'
import type { DomainTournament, TournamentAnalysis } from '~/types/domain'
import { normalizeChampionMon } from './battle'

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
