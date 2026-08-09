import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { styledSpriteUrl } from '~/utils/sprite'
import {
  SPRITE_STYLES, spriteStyleByKey, DEFAULT_SPRITE_STYLE,
  styleCovers, styleLimitation, SPRITE_PREVIEW_MONS
} from '~/constants/sprite-styles'
import { DEX_MAX } from '~/constants/generation'

describe('styledSpriteUrl', () => {
  it('style par défaut (backend) → null : on garde le sprite du jeu', () => {
    expect(styledSpriteUrl(DEFAULT_SPRITE_STYLE, 25)).toBeNull()
  })

  it('sert les styles embarqués depuis nos propres assets', () => {
    expect(styledSpriteUrl('gen4', 25)).toBe('/sprites/gen4/25.png')
    expect(styledSpriteUrl('artwork', 25)).toBe('/sprites/artwork/25.webp')
  })

  it('insère le segment shiny', () => {
    expect(styledSpriteUrl('gen4', 25, true)).toBe('/sprites/gen4/shiny/25.png')
  })

  it('Gen 5 animé reste distant, mais sur un vrai CDN', () => {
    const url = styledSpriteUrl('gen5a', 25)
    expect(url).toMatch(/^https:\/\/cdn\.jsdelivr\.net\//)
    expect(url).toMatch(/\.gif$/)
    // Régression : raw.githubusercontent n'est pas un CDN — ses requêtes
    // pendent au lieu d'échouer, ce qui laissait la fenêtre d'art vide.
    expect(url).not.toContain('raw.githubusercontent')
  })

  it('Gen 1 s\'arrête à Kanto et n\'a pas de shiny → repli sur le jeu', () => {
    expect(styledSpriteUrl('gen1', 25)).not.toBeNull()
    expect(styledSpriteUrl('gen1', 25, true)).toBeNull() // pas de shiny
    expect(styledSpriteUrl('gen1', 151)).not.toBeNull()
    expect(styledSpriteUrl('gen1', 152)).toBeNull() // Johto : hors portée
    expect(styledSpriteUrl('gen1', 249)).toBeNull()
  })

  it('les autres styles couvrent Johto', () => {
    for (const s of SPRITE_STYLES.filter(x => x.path && x.key !== 'gen1')) {
      expect(styledSpriteUrl(s.key, 249), s.key).not.toBeNull()
      expect(styledSpriteUrl(s.key, 249, true), s.key).not.toBeNull()
    }
  })

  it('n° invalide ou hors Pokédex → null', () => {
    expect(styledSpriteUrl('gen4', 0)).toBeNull()
    expect(styledSpriteUrl('gen4', 1.5)).toBeNull()
    expect(styledSpriteUrl('gen4', DEX_MAX + 1)).toBeNull()
  })

  it('clé inconnue → repli sur le style par défaut (donc null)', () => {
    expect(styledSpriteUrl('nawak', 25)).toBeNull()
  })
})

describe('catalogue des styles', () => {
  it('les clés sont uniques', () => {
    const keys = SPRITE_STYLES.map(s => s.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('le style par défaut existe et est servi par le backend', () => {
    expect(spriteStyleByKey(DEFAULT_SPRITE_STYLE).path).toBeNull()
  })

  it('annonce en clair ce qu\'un style ne sait pas rendre', () => {
    expect(styleLimitation(spriteStyleByKey('gen1'))).toBe('Kanto seulement, sans shiny')
    expect(styleLimitation(spriteStyleByKey('gen4'))).toBeNull()
  })

  it('styleCovers borne bien chaque style', () => {
    const gen1 = spriteStyleByKey('gen1')
    expect(styleCovers(gen1, 151)).toBe(true)
    expect(styleCovers(gen1, 152)).toBe(false)
    expect(styleCovers(gen1, 25, true)).toBe(false)
    // Le style du jeu couvre tout : c'est lui le repli.
    expect(styleCovers(spriteStyleByKey('backend'), 999, true)).toBe(true)
  })

  it('les Pokémon d\'aperçu couvrent les deux régions', () => {
    const gens = new Set(SPRITE_PREVIEW_MONS.map(m => (m.num <= 151 ? 1 : 2)))
    expect(gens).toEqual(new Set([1, 2]))
  })
})

// Le catalogue TypeScript et les fichiers réellement embarqués doivent rester
// d'accord : déclarer un style « local » sans avoir lancé le script de
// récupération produirait des cartes vides en production.
describe('assets embarqués', () => {
  const pub = fileURLToPath(new URL('../../public/sprites/', import.meta.url))

  for (const s of SPRITE_STYLES.filter(x => x.local)) {
    it(`${s.key} : le jeu complet est présent dans public/sprites`, () => {
      const dir = `${pub}${s.path}`
      expect(existsSync(dir), `${dir} manquant — lancer scripts/fetch-sprites.py`).toBe(true)

      const expected = s.dexMax ?? DEX_MAX
      const normals = readdirSync(dir).filter(f => f.endsWith(`.${s.ext}`))
      expect(normals.length, `${s.key} normaux`).toBe(expected)

      if (!s.noShiny) {
        const shinies = readdirSync(`${dir}/shiny`).filter(f => f.endsWith(`.${s.ext}`))
        expect(shinies.length, `${s.key} shiny`).toBe(expected)
      }
    })
  }
})
