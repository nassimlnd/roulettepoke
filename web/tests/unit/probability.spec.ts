import { describe, it, expect } from 'vitest'
import { probColor } from '~/utils/probability'

describe('probColor', () => {
  it('≥ 60 % → vert', () => {
    expect(probColor(60)).toBe('#3f9e66')
    expect(probColor(100)).toBe('#3f9e66')
  })

  it('40–59 % → orange', () => {
    expect(probColor(40)).toBe('#cc6f16')
    expect(probColor(59)).toBe('#cc6f16')
  })

  it('< 40 % → rouge', () => {
    expect(probColor(39)).toBe('#c62617')
    expect(probColor(0)).toBe('#c62617')
  })
})
