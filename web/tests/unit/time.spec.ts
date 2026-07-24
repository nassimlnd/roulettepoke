import { describe, it, expect } from 'vitest'
import { timeAgo } from '~/utils/time'

// Construit une date ISO à N secondes dans le passé (relatif à maintenant).
function agoIso(seconds: number): string {
  return new Date(Date.now() - seconds * 1000).toISOString()
}

describe('timeAgo', () => {
  it('< 1 min → « à l\'instant »', () => {
    expect(timeAgo(agoIso(5))).toBe('à l\'instant')
  })

  it('minutes', () => {
    expect(timeAgo(agoIso(5 * 60))).toBe('il y a 5 min')
  })

  it('heures', () => {
    expect(timeAgo(agoIso(3 * 3600))).toBe('il y a 3 h')
  })

  it('jours (< 7)', () => {
    expect(timeAgo(agoIso(3 * 86400))).toBe('il y a 3 j')
  })

  it('≥ 7 jours → date formatée (fr-FR)', () => {
    const out = timeAgo(agoIso(30 * 86400))
    expect(out).not.toContain('il y a')
    expect(out).toMatch(/\d/)
  })

  it('date future → « à l\'instant » (jamais négatif)', () => {
    expect(timeAgo(agoIso(-100))).toBe('à l\'instant')
  })
})
