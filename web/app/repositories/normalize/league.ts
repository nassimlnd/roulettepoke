// Normalisation de la Ligue des 4 (statut, estimation, run, récompense légendaire).
import type { LeagueStatus, WireLeagueEstimate, WireLeagueRun, WireLegendaryReward } from '~/types/api'
import type { DomainLeagueStatus, LeagueEstimate, LeagueRun, LegendaryReward } from '~/types/domain'
import { normalizeCard } from './card'
import { normalizeBattleRound } from './battle'

export function normalizeLeagueRun(r: WireLeagueRun): LeagueRun {
  return {
    runId: r.runId,
    won: r.won,
    stages: (r.battleLog ?? []).map(s => ({
      opponentName: s.opponent_name,
      opponentType: s.opponent_type,
      won: s.won,
      rounds: (s.log ?? []).map(normalizeBattleRound)
    }))
  }
}

export function normalizeLeagueStatus(s: LeagueStatus): DomainLeagueStatus {
  return {
    eligible: s.eligible,
    cycleStart: s.cycleStart,
    alreadyAttempted: s.alreadyAttempted,
    lastRun: s.lastRun ? normalizeLeagueRun(s.lastRun) : null,
    legendaries: (s.legendaries ?? []).map(l => ({ id: l.id, name: l.name, imageUrl: l.image_url }))
  }
}

export function normalizeLeagueEstimate(e: WireLeagueEstimate): LeagueEstimate {
  return {
    overallWinProbability: e.overall_win_probability,
    stages: (e.stages ?? []).map(s => ({
      opponentName: s.opponent_name,
      opponentType: s.opponent_type,
      winProbability: s.estimated_win_probability
    })),
    toPrivilege: (e.typeRecommendations?.toPrivilege ?? []).map(t => t.type),
    toAvoid: (e.typeRecommendations?.toAvoid ?? []).map(t => t.type)
  }
}

export function normalizeLegendaryReward(r: WireLegendaryReward): LegendaryReward {
  return {
    won: r.won,
    card: normalizeCard(r.card),
    rounds: (r.log ?? []).map(normalizeBattleRound)
  }
}
