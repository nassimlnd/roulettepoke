import { describe, it, expect } from 'vitest'
import { animatedSpriteUrl } from '~/utils/sprite'

describe('animatedSpriteUrl', () => {
  it('construit l\'URL du sprite standard', () => {
    expect(animatedSpriteUrl(21)).toMatch(/\/animated\/21\.gif$/)
  })

  it('construit l\'URL de la variante shiny', () => {
    expect(animatedSpriteUrl(21, true)).toMatch(/\/animated\/shiny\/21\.gif$/)
  })

  it('couvre tout Kanto (1 → 151)', () => {
    expect(animatedSpriteUrl(1)).not.toBeNull()
    expect(animatedSpriteUrl(151)).not.toBeNull()
  })

  it('null au-delà de la Gen 5 (pas de sprite animé)', () => {
    expect(animatedSpriteUrl(650)).toBeNull()
  })

  it('null sur un n° invalide', () => {
    expect(animatedSpriteUrl(0)).toBeNull()
    expect(animatedSpriteUrl(-3)).toBeNull()
    expect(animatedSpriteUrl(1.5)).toBeNull()
  })
})
