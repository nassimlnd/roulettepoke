import { describe, it, expect } from 'vitest'
import { FetchError } from 'ofetch'
import { humanizeError } from '~/utils/errors'

function fetchError(status: number | undefined, data?: unknown): FetchError {
  const err = new FetchError('boom')
  Object.assign(err, { response: status ? { status } : undefined, data })
  return err
}

describe('humanizeError', () => {
  it('réseau (pas de réponse) → message humain', () => {
    expect(humanizeError(fetchError(undefined))).toContain('Connexion impossible')
  })

  it('réutilise le message métier du backend', () => {
    expect(humanizeError(fetchError(400, { error: 'Pas assez de coins' }))).toBe('Pas assez de coins')
  })

  it('500 sans message → message générique, jamais technique', () => {
    const msg = humanizeError(fetchError(500))
    expect(msg).toContain('serveur')
    expect(msg).not.toContain('Failed to fetch')
  })

  it('erreur inconnue → message par défaut', () => {
    expect(humanizeError('n\'importe quoi')).toBe('Une erreur inattendue est survenue.')
  })
})
