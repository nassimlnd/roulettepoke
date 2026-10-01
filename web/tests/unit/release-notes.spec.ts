import { describe, it, expect } from 'vitest'
import { RELEASE_NOTES, LATEST_VERSION, NOTE_SECTION_META } from '~/config/release-notes'

describe('notes de version', () => {
  it('la plus récente est en tête et c\'est elle que la pastille surveille', () => {
    expect(LATEST_VERSION).toBe(RELEASE_NOTES[0]!.version)
    const dates = RELEASE_NOTES.map(n => n.date)
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates)
  })

  it('versions uniques, dates ISO, sections connues et jamais vides', () => {
    const versions = RELEASE_NOTES.map(n => n.version)
    expect(new Set(versions).size).toBe(versions.length)
    for (const n of RELEASE_NOTES) {
      expect(n.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(n.title.length).toBeGreaterThan(0)
      expect(n.sections.length).toBeGreaterThan(0)
      for (const s of n.sections) {
        expect(Object.keys(NOTE_SECTION_META)).toContain(s.type)
        expect(s.groups.length).toBeGreaterThan(0)
        for (const g of s.groups) expect(g.items.length).toBeGreaterThan(0)
      }
    }
  })
})
