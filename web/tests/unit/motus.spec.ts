import { describe, it, expect } from 'vitest'
import { bestLetterStates } from '~/utils/motus'
import type { MotusAttempt } from '~/types/api'

// Forme relevée sur l'API le 9 août 2026 (essai réel : PARTAGE).
const attempt = (guess: string, states: string[]): MotusAttempt => ({
  guess,
  result: guess.split('').map((letter, i) => ({
    letter,
    state: states[i] as MotusAttempt['result'][number]['state']
  }))
})

describe('bestLetterStates', () => {
  it('sans essai, ne connaît rien', () => {
    expect(bestLetterStates([])).toEqual({})
  })

  it('reprend l\'état de chaque lettre d\'un essai', () => {
    const states = bestLetterStates([
      attempt('PARTAGE', ['correct', 'present', 'absent', 'present', 'present', 'absent', 'absent'])
    ])
    expect(states.P).toBe('correct')
    expect(states.T).toBe('present')
    expect(states.R).toBe('absent')
    // A apparaît deux fois « present » : une seule entrée, même état.
    expect(states.A).toBe('present')
  })

  it('retient la MEILLEURE information au fil des essais, jamais l\'inverse', () => {
    const states = bestLetterStates([
      // 1er essai : T mal placée, A absente sur cette case.
      attempt('TA', ['present', 'absent']),
      // 2e essai : T bien placée — l'information progresse.
      attempt('TA', ['correct', 'present'])
    ])
    expect(states.T).toBe('correct')
    expect(states.A).toBe('present')
  })

  it('ne rétrograde pas une lettre déjà bien placée (doublons de lettres)', () => {
    const states = bestLetterStates([
      attempt('TT', ['correct', 'absent'])
    ])
    // Le second T « absent » signifie seulement qu'il n'y a pas DEUX T :
    // la lettre reste marquée bien placée sur le clavier.
    expect(states.T).toBe('correct')
  })
})
