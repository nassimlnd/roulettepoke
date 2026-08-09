import type { MotusAttempt, MotusCellState } from '~/types/api'

// Meilleur état connu de chaque lettre au fil des essais — c'est ce qui colore
// le clavier virtuel. « correct » l'emporte sur « present », qui l'emporte sur
// « absent » : avec des lettres en double, un même glyphe peut être marqué
// absent sur une case et bien placé sur une autre — on retient la meilleure
// information, jamais l'inverse.
const PRIORITY: Record<MotusCellState, number> = { absent: 0, present: 1, correct: 2 }

export function bestLetterStates(
  attempts: readonly MotusAttempt[]
): Record<string, MotusCellState> {
  const best: Record<string, MotusCellState> = {}
  for (const attempt of attempts) {
    for (const { letter, state } of attempt.result) {
      const known = best[letter]
      if (!known || PRIORITY[state] > PRIORITY[known]) best[letter] = state
    }
  }
  return best
}
