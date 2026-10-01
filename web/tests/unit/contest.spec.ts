import { describe, it, expect } from 'vitest'
import { contestCandidates, displayScores, splitJudgeScores, restrictionLabel } from '~/utils/contest'
import { normalizeContest } from '~/repositories/normalize'
import type { DomainOwnedCard, ContestResult } from '~/types/domain'
import type { WireContest } from '~/types/api'

let seq = 0
function card(over: Partial<DomainOwnedCard> = {}): DomainOwnedCard {
  const id = over.id ?? `c${++seq}`
  return {
    id, num: 100 + seq, generation: 1, name: id, imageUrl: '', rarity: 'Commun', isShiny: false, level: 1,
    biome: 'Forêt', type: 'Plante', parentCardId: id, standardId: null,
    contestStats: { 'Sang-froid': 10, 'Beauté': 20, 'Grâce': 30, 'Intelligence': 40, 'Robustesse': 50 },
    quantity: 1, owned: true, obtainedAt: null, ...over
  }
}

describe('contestCandidates', () => {
  it('exclut shiny, légendaires, non possédées et hors restriction, et trie par stat', () => {
    const cards = [
      card({ id: 'faible', contestStats: { 'Sang-froid': 1, 'Beauté': 1, 'Grâce': 5, 'Intelligence': 1, 'Robustesse': 1 } }),
      card({ id: 'fort', contestStats: { 'Sang-froid': 1, 'Beauté': 1, 'Grâce': 90, 'Intelligence': 1, 'Robustesse': 1 } }),
      card({ id: 'shiny', isShiny: true }),
      card({ id: 'legend', rarity: 'Légendaire' }),
      card({ id: 'absent', owned: false, quantity: 0 }),
      card({ id: 'mer', biome: 'Mer' }),
      card({ id: 'sansstat', contestStats: null })
    ]
    const all = contestCandidates(cards, 'Grâce', null)
    expect(all.map(c => c.card.id)).toEqual(['fort', 'mer', 'faible'])
    expect(all[0]!.stat).toBe(90)
    const mer = contestCandidates(cards, 'Grâce', { type: 'biome', value: 'Mer' })
    expect(mer.map(c => c.card.id)).toEqual(['mer'])
    expect(contestCandidates(cards, 'Grâce', { type: 'type', value: 'Eau' })).toEqual([])
  })

  it('plafonne la liste', () => {
    const many = Array.from({ length: 25 }, (_, i) => card({ id: `m${i}` }))
    expect(contestCandidates(many, 'Beauté', null)).toHaveLength(18)
  })
})

describe('displayScores', () => {
  const res = (placement: number, score: number): ContestResult =>
    ({ userId: `u${placement}`, placement, username: `p${placement}`, cardName: 'x', imageUrl: null, score, cardRemoved: placement === 1, prizeCardId: null, prizeCardName: null, prizeCardImageUrl: null })

  it('casse les faux ex-aequo d\'arrondi : le mieux classé garde la valeur', () => {
    const m = displayScores([res(1, 127.4), res(2, 127.2), res(3, 126.8), res(4, 120.1)])
    expect([1, 2, 3, 4].map(p => m.get(p))).toEqual([127, 126, 126, 120])
  })
})

describe('splitJudgeScores', () => {
  it('répartit un total entier entre trois juges, somme exacte', () => {
    for (const total of [0, 1, 7, 100, 127, 148]) {
      const parts = splitJudgeScores(total)
      expect(parts).toHaveLength(3)
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total)
      expect(parts[0]).toBeGreaterThanOrEqual(parts[2]!)
    }
  })
})

describe('normalizeContest', () => {
  // Relevé réel : le score arrive en CHAÎNE, la restriction « aucune » n'est pas une restriction.
  const wire: WireContest = {
    id: 'k1', contest_date: '2026-09-29T00:00:00.000Z', status: 'completed', discipline: 'Grâce',
    restriction_type: 'biome', restriction_value: 'Mer', created_at: '2026-09-23T22:00:01.023Z',
    revealed_at: '2026-09-29T10:00:00.197Z', entry_count: 18,
    results: [
      { user_id: 'u1', placement: 1, score: '148.1469645953645', card_removed: true, prize_card_id: 'j', prize_card_name: 'Jirachi', prize_card_image_url: '/images/jirachi.webp', username: 'Perrine', card_name: 'Corayon', image_url: '/images/corsola.webp' },
      { user_id: 'u2', placement: 2, score: '139.55', card_removed: false, prize_card_id: null, prize_card_name: null, username: 'Nate', card_name: 'Noeunoeuf', image_url: null }
    ]
  }

  it('convertit les nombres et la restriction', () => {
    const c = normalizeContest(wire)
    expect(c.results[0]!.score).toBeCloseTo(148.15, 1)
    expect(c.results[0]!.prizeCardName).toBe('Jirachi')
    expect(c.restriction).toEqual({ type: 'biome', value: 'Mer' })
    expect(c.entries).toEqual([])
    expect(c.judges).toEqual([])
    expect(c.isRegistered).toBe(false)
    expect(normalizeContest({ ...wire, restriction_type: 'aucune' }).restriction).toBeNull()
    expect(restrictionLabel(c.restriction)).toBe('Réservé aux Pokémon du biome Mer')
  })
})
