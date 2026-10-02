import { describe, it, expect } from 'vitest'
import { describeGameEvent, eventsSignature, merchantOffer, describeGoal } from '~/utils/gameEvents'
import { hashToRoute } from '~/utils/links'
import type { WireGameEvent, WireCommunityGoal } from '~/types/api'

describe('describeGameEvent', () => {
  it('décrit les huit types du jeu avec leurs chiffres', () => {
    expect(describeGameEvent({ type: 'sales' })?.text).toContain('−50 %')
    expect(describeGameEvent({ type: 'generation_day', params: { generation: 3 } })).toMatchObject({
      title: 'Journée Hoenn', to: '/play'
    })
    expect(describeGameEvent({ type: 'jackpot_frenzy' })?.to).toBe('/slot-machine')
    expect(describeGameEvent({ type: 'open_gyms' })?.to).toBe('/gyms')
    expect(describeGameEvent({ type: 'spin_lucky' })?.to).toBe('/spin')
    expect(describeGameEvent({ type: 'daily_bonus_x2' })?.title).toBe('Prime du jour ×2')
    expect(describeGameEvent({ type: 'special_rain' })?.text).toContain('3×')
  })

  it('nomme ce que cherche le marchand et son prix', () => {
    const e: WireGameEvent = {
      type: 'merchant',
      merchant: { price: 250, wanted: [{ cardId: 'c1', name: 'Tauros', generation: 1 }, { cardId: 'c2', name: 'Donphan', generation: 2 }] }
    }
    const v = describeGameEvent(e)!
    expect(v.text).toContain('Tauros (Kanto), Donphan (Johto)')
    expect(v.text).toContain('250 🪙')
    expect(v.to).toBe('/collection')
  })

  it('ignore un marchand sans Pokémon et un type inconnu, sans planter', () => {
    expect(describeGameEvent({ type: 'merchant', merchant: { wanted: [] } })).toBeNull()
    expect(describeGameEvent({ type: 'meteor_shower' })).toBeNull()
  })
})

describe('eventsSignature', () => {
  it('change avec le jour ou la liste des événements', () => {
    const a = eventsSignature({ date: '2026-10-01', active: [{ type: 'sales', startsOn: '2026-10-01' }] })
    const b = eventsSignature({ date: '2026-10-02', active: [{ type: 'sales', startsOn: '2026-10-01' }] })
    const c = eventsSignature({ date: '2026-10-01', active: [] })
    expect(a).not.toBe(b)
    expect(a).not.toBe(c)
    expect(eventsSignature(null)).toBe('')
  })
})

describe('merchantOffer', () => {
  const merchant = { price: 250, wanted: [{ cardId: 'c1', name: 'Tauros', generation: 1 }], drawnTodayCardIds: ['c1'], soldCardIds: [] }

  it('n\'offre que pour une carte recherchée, tirée aujourd\'hui et pas encore vendue', () => {
    expect(merchantOffer(merchant, 'c1')).toEqual({ price: 250, eligible: true })
    expect(merchantOffer({ ...merchant, drawnTodayCardIds: [] }, 'c1')).toEqual({ price: 250, eligible: false })
    expect(merchantOffer({ ...merchant, soldCardIds: ['c1'] }, 'c1')).toEqual({ price: 250, eligible: false })
    expect(merchantOffer(merchant, 'c9')).toBeNull()
    expect(merchantOffer(null, 'c1')).toBeNull()
  })
})

describe('describeGoal', () => {
  const goal: WireCommunityGoal = {
    weekStart: '2026-09-28', weekEnd: '2026-10-04', metric: 'spin_runs', target: 250, progress: 216,
    achieved: false, status: 'active', minContribution: 3, myContribution: 0, contributors: 17,
    reward: { item: 'tirage_type_feu', quantity: 1, label: 'Ticket Type Feu' }
  }

  it('calcule la progression et l\'éligibilité du joueur', () => {
    expect(describeGoal(goal)).toMatchObject({ percent: 86, qualifies: false, missing: 3, noun: 'parties d\'Aventure' })
    expect(describeGoal({ ...goal, myContribution: 5 })).toMatchObject({ qualifies: true, missing: 0 })
    expect(describeGoal({ ...goal, progress: 400 })?.percent).toBe(100)
  })

  it('tolère une métrique inconnue et une absence d\'objectif', () => {
    expect(describeGoal({ ...goal, metric: 'trades' })?.noun).toBe('actions')
    expect(describeGoal(null)).toBeNull()
    expect(describeGoal({ ...goal, target: 0 })).toBeNull()
  })
})

describe('hashToRoute', () => {
  it('traduit les ancres du front d\'origine vers nos routes', () => {
    expect(hashToRoute('#suggestions')).toBe('/suggestions')
    expect(hashToRoute('#home')).toBe('/play')
    expect(hashToRoute('#slot-machine')).toBe('/slot-machine')
    expect(hashToRoute('#reset-password?token=abc')).toBeNull()
  })

  it('donne null pour les pages que nous n\'avons pas, jamais un lien mort', () => {
    expect(hashToRoute('#contest')).toBe('/contest')
    expect(hashToRoute('#coloring')).toBe('/paintkemon')
    expect(hashToRoute('#patchnotes')).toBe('/notes')
    expect(hashToRoute('#chat')).toBeNull()
    expect(hashToRoute(null)).toBeNull()
    expect(hashToRoute('')).toBeNull()
  })
})
