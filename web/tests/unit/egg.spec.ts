import { describe, it, expect } from 'vitest'
import { eggStatusLabel } from '~/utils/egg'

describe('œuf mystérieux', () => {
  it('décrit l\'incubation par paliers de tirages restants', () => {
    expect(eggStatusLabel(60)).toBe('Aucune activité pour l\'instant')
    expect(eggStatusLabel(50)).toBe('Aucune activité pour l\'instant')
    expect(eggStatusLabel(49)).toBe('Ça commence à bouger')
    expect(eggStatusLabel(35)).toBe('Ça commence à bouger')
    expect(eggStatusLabel(20)).toBe('Pas de doute, ça bouge')
    expect(eggStatusLabel(19)).toBe('L\'œuf va éclore dans très peu de temps')
    expect(eggStatusLabel(0)).toBe('L\'œuf va éclore dans très peu de temps')
  })
})
