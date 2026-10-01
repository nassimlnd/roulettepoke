import { describe, it, expect } from 'vitest'
import { normalizeGymAttempt } from '~/repositories/normalize/gym'
import type { WireGymAttempt } from '~/types/api'

const base: WireGymAttempt = {
  id: 'a1',
  attempted_at: '2026-07-22T21:39:58.961Z',
  won: false,
  battle_log: {
    log: [{ round: 1, roll_value: 46, player_pokemon: { name: 'Chenipan', image_url: '/images/caterpie.webp' }, win_probability: 27, champion_pokemon: { name: 'Racaillou', image_url: '/images/geodude.webp' }, player_wins_duel: false }],
    won: false,
    player_team: [{ name: 'Chenipan', type: 'Insecte', rarity: 'Commun', image_url: '/images/caterpie.webp' }]
  },
  gym_name: 'Arène d\'Argenta',
  order_num: 1,
  type: 'Roche',
  generation: 1,
  badge_name: 'Badge Roche',
  badge_image_url: '/images/badges/Kanto_1.png'
}

describe('historique des arènes', () => {
  it('garde le journal, l\'équipe et le rang dans le circuit', () => {
    const a = normalizeGymAttempt(base)
    expect(a.orderInCircuit).toBe(1)
    expect(a.generation).toBe(1)
    expect(a.rounds).toHaveLength(1)
    expect(a.rounds[0]).toMatchObject({ player: { name: 'Chenipan' }, champion: { name: 'Racaillou' }, playerWon: false })
    expect(a.team).toEqual([{ name: 'Chenipan', imageUrl: '/images/caterpie.webp' }])
  })

  it('ramène une arène de Johto ou Hoenn à son rang de circuit, génération déduite si absente', () => {
    expect(normalizeGymAttempt({ ...base, order_num: 9, generation: 2 }).orderInCircuit).toBe(1)
    const hoenn = normalizeGymAttempt({ ...base, order_num: 24, generation: undefined })
    expect(hoenn.generation).toBe(3)
    expect(hoenn.orderInCircuit).toBe(8)
  })

  it('tolère un journal absent', () => {
    const a = normalizeGymAttempt({ ...base, battle_log: null })
    expect(a.rounds).toEqual([])
    expect(a.team).toEqual([])
  })
})
