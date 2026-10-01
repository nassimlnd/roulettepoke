import { describe, it, expect, vi, afterEach } from 'vitest'
import { normalizeGym, normalizeTeamMember } from '~/repositories/normalize'
import type { WireGym, WireTeamMember } from '~/types/api'
import {
  asGeneration, generationRegion, generationMeta, currencyOf, coinsField,
  GENERATIONS, TEAM_SCOPES, DEX_MAX
} from '~/constants/generation'

// Charge utile relevée sur l'API de production (v5, 1ᵉʳ octobre 2026).
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
const hoennGym: WireGym = {
  ...kantoGym,
  id: 'g24',
  order_num: 24,
  generation: 3,
  name: 'Arène d\'Atalanopolis',
  type: 'Eau',
  badge_name: 'Badge Pluie'
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('générations', () => {
  it('accepte les trois régions telles quelles', () => {
    expect(asGeneration(1)).toBe(1)
    expect(asGeneration(2)).toBe(2)
    expect(asGeneration(3)).toBe(3)
  })

  it('ne déguise JAMAIS une génération inconnue en Kanto : elle passe, et on prévient', () => {
    // Régression : l'ancien repli muet `v === 2 ? 2 : 1` a rangé les 270
    // cartes et les 8 arènes de Hoenn dans Kanto sans qu'aucun écran ne proteste.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(asGeneration(4)).toBe(4)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(generationRegion(4 as never)).toBe('Génération 4')
    // Une valeur absente ou aberrante retombe sur la génération par défaut.
    expect(asGeneration(undefined)).toBe(1)
    expect(asGeneration('2')).toBe(1) // l'API renvoie un nombre, pas une chaîne
    expect(asGeneration(-1)).toBe(1)
  })

  it('dérive tout de la source unique', () => {
    expect(GENERATIONS.map(g => g.region)).toEqual(['Kanto', 'Johto', 'Hoenn'])
    expect(GENERATIONS.map(g => g.teamScope)).toEqual(['gen1', 'gen2', 'gen3'])
    expect(GENERATIONS.map(g => g.boardScope)).toEqual(['kanto', 'johto', 'hoenn'])
    expect(TEAM_SCOPES.map(s => s.value)).toEqual(['global', 'gen1', 'gen2', 'gen3'])
    expect(DEX_MAX).toBe(386)
    expect(generationMeta(3).dexFrom).toBe(252)
    expect(currencyOf(3)).toBe('gen3')
    expect(coinsField(2)).toBe('coins_gen2')
  })
})

describe('normalizeGym', () => {
  it('ramène le rang global au rang dans son propre parcours', () => {
    // Régression : Johto est numéroté 9..16 et Hoenn 17..24 côté API ; la page
    // affichait « Arène 14 » et, en v5, « Arène 24 » sous Kanto.
    expect(normalizeGym(kantoGym).orderInCircuit).toBe(1)
    expect(normalizeGym(johtoGym).orderInCircuit).toBe(6)
    expect(normalizeGym(johtoGym).order).toBe(14)
    expect(normalizeGym(hoennGym).orderInCircuit).toBe(8)
  })

  it('porte la génération de l\'arène', () => {
    expect(normalizeGym(kantoGym).generation).toBe(1)
    expect(normalizeGym(johtoGym).generation).toBe(2)
    expect(normalizeGym(hoennGym).generation).toBe(3)
  })

  it('retombe sur Kanto si le champ manque (API antérieure à la v4), en prévenant', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
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
