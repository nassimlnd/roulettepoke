import { describe, it, expect } from 'vitest'
import { readdirSync } from 'node:fs'
import { PRIMARY_LINKS, COMPETITION_LINKS, SECONDARY_LINKS, ALL_NAV_LINKS } from '~/config/navigation'

// Ces pages ne sont pas des destinations de navigation.
const NOT_NAV = new Set([
  'index', // landing publique
  'login', 'register', 'forgot-password', 'reset-password', // auth
  'settings', // accessible par le menu compte
  'showcase-cards', 'showcase-battle', // pages de validation interne
  '[...slug]' // 404
])

describe('navigation', () => {
  it('aucune page de jeu n\'est orpheline (régression : Ligue/Tournoi/Échanges absents de la navbar)', () => {
    const pages = readdirSync(new URL('../../app/pages', import.meta.url))
      .filter(f => f.endsWith('.vue'))
      .map(f => f.replace(/\.vue$/, ''))
      .filter(p => !NOT_NAV.has(p))

    const reachable = new Set(ALL_NAV_LINKS.map(l => l.to.replace(/^\//, '')))
    const orphans = pages.filter(p => !reachable.has(p))
    expect(orphans, `pages sans entrée de navigation : ${orphans.join(', ')}`).toEqual([])
  })

  it('aucune destination dupliquée entre les groupes', () => {
    const tos = ALL_NAV_LINKS.map(l => l.to)
    expect(new Set(tos).size).toBe(tos.length)
  })

  it('chaque groupe est non vide et complètement renseigné', () => {
    for (const group of [PRIMARY_LINKS, COMPETITION_LINKS, SECONDARY_LINKS]) {
      expect(group.length).toBeGreaterThan(0)
      for (const l of group) {
        expect(l.to.startsWith('/')).toBe(true)
        expect(l.label.length).toBeGreaterThan(0)
        expect(l.icon.startsWith('i-')).toBe(true)
      }
    }
  })
})
