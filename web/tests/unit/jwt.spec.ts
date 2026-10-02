import { describe, it, expect } from 'vitest'
import { decodeJwtUserId } from '~/utils/jwt'

// Construit un JWT factice (signature ignorée — on ne teste que le décodage
// best-effort du payload).
function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64')
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.sig`
}

describe('decodeJwtUserId', () => {
  it('extrait l\'id du payload', () => {
    expect(decodeJwtUserId(fakeJwt({ id: 'abc-123' }))).toBe('abc-123')
  })

  it('token null → null', () => {
    expect(decodeJwtUserId(null)).toBeNull()
  })

  it('payload sans id → null', () => {
    expect(decodeJwtUserId(fakeJwt({ email: 'x@y.z' }))).toBeNull()
  })

  it('token malformé (pas de payload) → null', () => {
    expect(decodeJwtUserId('pas-un-jwt')).toBeNull()
  })

  it('payload non décodable → null (pas d\'exception)', () => {
    expect(decodeJwtUserId('a.@@@.c')).toBeNull()
  })
})
