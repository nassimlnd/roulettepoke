// Normalisation du Concours hebdomadaire (v5.0).
import type { WireContest, WireContestSummary, WireContestPrizeOption } from '~/types/api'
import type { DomainContest, ContestSummary, ContestRestriction, ContestPrizeOption } from '~/types/domain'
import { asGeneration } from '~/constants/generation'

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function restriction(type: WireContest['restriction_type'], value: string | null): ContestRestriction | null {
  if ((type === 'biome' || type === 'type') && value) return { type, value }
  return null
}

export function normalizeContest(w: WireContest): DomainContest {
  return {
    id: w.id,
    date: w.contest_date,
    status: w.status,
    discipline: w.discipline,
    restriction: restriction(w.restriction_type, w.restriction_value),
    entryCount: w.entry_count ?? 0,
    isRegistered: !!w.is_registered,
    myDanceScore: w.my_dance_score ?? null,
    entries: (w.entries ?? []).map(e => ({
      userId: e.user_id,
      username: e.username,
      imageUrl: e.image_url ?? null,
      cardName: e.card_name,
      stat: num(e.stat) ?? 0,
      danceRounds: e.dance_rounds ?? null,
      danceBonus: e.dance_bonus ?? null,
      partialScore: num(e.partial_score)
    })),
    results: (w.results ?? []).map(r => ({
      userId: r.user_id,
      placement: r.placement,
      username: r.username,
      cardName: r.card_name,
      imageUrl: r.image_url ?? null,
      score: num(r.score) ?? 0,
      cardRemoved: !!r.card_removed,
      prizeCardId: r.prize_card_id ?? null,
      prizeCardName: r.prize_card_name ?? null,
      prizeCardImageUrl: r.prize_card_image_url ?? null
    })),
    judges: w.judges ?? []
  }
}

export function normalizeContestSummary(w: WireContestSummary): ContestSummary {
  return {
    id: w.id,
    date: w.contest_date,
    status: w.status,
    discipline: w.discipline,
    restriction: restriction(w.restriction_type, w.restriction_value),
    entryCount: w.entry_count ?? 0
  }
}

export function normalizeContestPrize(p: WireContestPrizeOption): ContestPrizeOption {
  return { id: p.id, name: p.name, imageUrl: p.image_url, generation: asGeneration(p.generation) }
}
