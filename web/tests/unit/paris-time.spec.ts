import { describe, it, expect } from 'vitest'
import { nextDailyReset, nextWeekly } from '~/utils/paris-time'

// Formate un instant UTC en heure civile Paris pour vérifier les resets.
function parisHM(d: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(d)
}
function parisWeekday(d: Date): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short' }).format(d)
}

describe('nextDailyReset', () => {
  it('tombe à minuit Paris et dans le futur', () => {
    const from = new Date('2026-07-20T10:00:00Z')
    const r = nextDailyReset(from)
    expect(r.getTime()).toBeGreaterThan(from.getTime())
    expect(parisHM(r)).toBe('00:00')
  })

  it('gère le passage après minuit (heure d\'été)', () => {
    // 20 juillet 23:30 Paris (21:30 UTC en été) → prochain minuit = 21 juillet
    const from = new Date('2026-07-20T21:30:00Z')
    const r = nextDailyReset(from)
    expect(parisHM(r)).toBe('00:00')
    expect(r.getTime()).toBeGreaterThan(from.getTime())
  })
})

describe('nextWeekly', () => {
  it('trouve le prochain lundi 00:00 Paris', () => {
    const from = new Date('2026-07-20T10:00:00Z') // lundi
    const r = nextWeekly(1, 0, 0, from)
    expect(parisWeekday(r)).toBe('Mon')
    expect(parisHM(r)).toBe('00:00')
    expect(r.getTime()).toBeGreaterThan(from.getTime())
  })

  it('trouve le prochain jeudi 12:00 Paris', () => {
    const from = new Date('2026-07-20T10:00:00Z')
    const r = nextWeekly(4, 12, 0, from)
    expect(parisWeekday(r)).toBe('Thu')
    expect(parisHM(r)).toBe('12:00')
  })
})
