import { describe, it, expect } from 'vitest'
import { styledSpriteUrl } from '~/utils/sprite'
import { SPRITE_STYLES, spriteStyleByKey, DEFAULT_SPRITE_STYLE } from '~/constants/sprite-styles'

describe('styledSpriteUrl', () => {
  it('style par défaut (backend) → null : on garde le sprite du jeu', () => {
    expect(styledSpriteUrl(DEFAULT_SPRITE_STYLE, 25)).toBeNull()
  })

  it('construit l\'URL d\'un style génération', () => {
    expect(styledSpriteUrl('gen4', 25)).toMatch(/generation-iv\/heartgold-soulsilver\/25\.png$/)
  })

  it('insère le segment shiny', () => {
    expect(styledSpriteUrl('gen4', 25, true)).toMatch(/heartgold-soulsilver\/shiny\/25\.png$/)
  })

  it('respecte l\'extension du jeu (gif pour les styles animés)', () => {
    expect(styledSpriteUrl('gen5a', 25)).toMatch(/\.gif$/)
    expect(styledSpriteUrl('gen4', 25)).toMatch(/\.png$/)
  })

  it('Gen 1 n\'a pas de shiny → null (repli sur le backend)', () => {
    expect(styledSpriteUrl('gen1', 25)).not.toBeNull()
    expect(styledSpriteUrl('gen1', 25, true)).toBeNull()
  })

  it('n° invalide → null', () => {
    expect(styledSpriteUrl('gen4', 0)).toBeNull()
    expect(styledSpriteUrl('gen4', 1.5)).toBeNull()
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

  it('tout style non-backend a un chemin et une extension cohérente', () => {
    for (const s of SPRITE_STYLES.filter(x => x.path)) {
      expect(s.path).toBeTruthy()
      expect(['png', 'gif']).toContain(s.ext)
    }
  })
})
