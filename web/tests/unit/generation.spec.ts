import { describe, it, expect } from 'vitest'
import { normalizeGym, normalizeTeamMember } from '~/repositories/normalize'
import type { WireGym, WireTeamMember } from '~/types/api'
import { asGeneration, generationRegion, GENERATIONS } from '~/constants/generation'

// Charge utile relevée sur l'API de production le 6 août 2026.
const kantoGym: WireGym = {
  id: 'g1',
  order_num: 1,
  generation: 1,
  name: 'Arène d\'Argenta',
  type: 'Roche',
  badge_name: 'Badge Roche',
  badge_image_url: '/images/badges/Kanto_1.png',
  badge_obtained_at: null,
  last_attempt_this_week: null,
  has_badge: false,
  can_attempt: true
}
const johtoGym: WireGym = {
  ...kantoGym,
  id: 'g14',
  order_num: 14,
  generation: 2,
  name: 'Arène d\'Oliville',
  type: 'Acier',
  badge_name: 'Badge Minéral'
}

describe('générations', () => {
  it('n\'accepte que 1 et 2, et retombe sur Kanto sinon', () => {
    expect(asGeneration(1)).toBe(1)
    expect(asGeneration(2)).toBe(2)
    expect(asGeneration(3)).toBe(1)
    expect(asGeneration(undefined)).toBe(1)
    expect(asGeneration('2')).toBe(1) // l'API renvoie un nombre, pas une chaîne
  })

  it('nomme les deux régions', () => {
    expect(generationRegion(1)).toBe('Kanto')
    expect(generationRegion(2)).toBe('Johto')
    expect(GENERATIONS.map(g => g.teamScope)).toEqual(['gen1', 'gen2'])
  })
})

describe('normalizeGym', () => {
  it('ramène le rang global au rang dans son propre parcours', () => {
    // Régression : Johto est numéroté 9..16 côté API et s'affichait donc
    // « Arène 14 » alors que c'est la 6ᵉ de son circuit.
    expect(normalizeGym(kantoGym).orderInCircuit).toBe(1)
    expect(normalizeGym(johtoGym).orderInCircuit).toBe(6)
    expect(normalizeGym(johtoGym).order).toBe(14)
  })

  it('porte la génération de l\'arène', () => {
    expect(normalizeGym(kantoGym).generation).toBe(1)
    expect(normalizeGym(johtoGym).generation).toBe(2)
  })

  it('retombe sur Kanto si le champ manque (API antérieure à la v4)', () => {
    const { generation: _omit, ...legacy } = johtoGym
    void _omit
    expect(normalizeGym(legacy).generation).toBe(1)
  })
})

describe('normalizeTeamMember', () => {
  const wire: WireTeamMember = {
    team_entry_id: 'te1',
    position: 1,
    card_id: 'card-42',
    name: 'Chenipan',
    type: 'Insecte',
    rarity: 'Commun',
    image_url: '/images/caterpie.webp',
    generation: 1
  }

  it('lit card_id (la v4 a renommé le champ, cardId valait undefined)', () => {
    expect(normalizeTeamMember(wire).cardId).toBe('card-42')
  })
})
