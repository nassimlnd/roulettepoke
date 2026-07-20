import { describe, it, expect } from 'vitest'
import { normalizeCard, normalizeOwnedCard } from '~/repositories/normalize'
import type { WireCard, WireOwnedCard } from '~/types/api'

const base: WireCard = {
  id: 'c1',
  num: 1,
  name: 'Bulbizarre',
  image_url: '/images/bulbasaur.webp',
  rarity: 'Commun',
  level: 1,
  parent_card_id: 'c1',
  is_alt: false,
  biome: 'Forêt',
  type: 'Plante'
}

describe('normalizeCard', () => {
  it('mappe les champs wire vers domaine', () => {
    const c = normalizeCard(base)
    expect(c.imageUrl).toBe('/images/bulbasaur.webp')
    expect(c.rarity).toBe('Commun')
    expect(c.isShiny).toBe(false)
    expect(c.standardId).toBeNull()
  })

  it('réconcilie la rareté Alt en isShiny + rareté réelle', () => {
    const shiny: WireCard = { ...base, rarity: 'Alt', is_alt: true, name: 'Bulbizarre ☆' }
    const c = normalizeCard(shiny)
    expect(c.isShiny).toBe(true)
    expect(c.rarity).toBe('Commun') // rareté réelle, pas 'Alt'
  })

  it('détecte un légendaire via le biome Légendaire', () => {
    const leg: WireCard = { ...base, biome: 'Légendaire', rarity: 'Commun' }
    expect(normalizeCard(leg).rarity).toBe('Légendaire')
  })
})

describe('normalizeOwnedCard', () => {
  it('normalise quantity null en 0', () => {
    const owned: WireOwnedCard = { ...base, quantity: null, obtained_at: null, owned: false }
    const c = normalizeOwnedCard(owned)
    expect(c.quantity).toBe(0)
    expect(c.owned).toBe(false)
  })

  it('conserve la quantité et le statut possédé', () => {
    const owned: WireOwnedCard = { ...base, quantity: 7, obtained_at: '2026-01-01T00:00:00Z', owned: true }
    const c = normalizeOwnedCard(owned)
    expect(c.quantity).toBe(7)
    expect(c.owned).toBe(true)
  })
})
