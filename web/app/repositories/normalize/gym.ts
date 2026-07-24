// Normalisation des arènes : arène, détail (champions), estimation, combat,
// entraînement.
import type {
  WireGym, WireGymDetail, WireGymEstimate, WireBattleResult, WireTrainingResult
} from '~/types/api'
import type {
  DomainGym, GymDetail, GymEstimate, BattleResult, TrainingOutcome
} from '~/types/domain'
import { normalizeBattleRound, normalizeChampionMon } from './battle'

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

export function normalizeGymDetail(d: WireGymDetail): GymDetail {
  return {
    id: d.id,
    typeColor: d.type_color,
    typeImageUrl: d.type_image_url,
    champions: (d.champion_team ?? []).map(normalizeChampionMon),
    recommendedTypes: (d.recommended_types ?? []).map(t => ({ name: t.name, imageUrl: t.image_url, color: t.color }))
  }
}

export function normalizeGymEstimate(e: WireGymEstimate): GymEstimate {
  return {
    winProbability: e.estimated_win_probability,
    trainingBonus: e.training_bonus ?? 0,
    matchups: e.matchups ?? []
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
