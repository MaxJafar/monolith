import jwt from 'jsonwebtoken'
import { beforeAll, describe, expect, it, vi } from 'vitest'

let tokens: typeof import('../lib/auth/utils/tokens')
beforeAll(async () => {
  vi.stubEnv('JWT_SIGNING_KEY', 'source-replacement-test-signing-key')
  tokens = await import('../lib/auth/utils/tokens')
  vi.unstubAllEnvs()
})

describe('Monolith session tokens', () => {
  it('issues compatible HS512 tokens with a user, unique session ID and 15-minute lifetime', () => {
    const first = tokens.verifyAccessToken(tokens.signAccessToken('test-user'))
    const second = tokens.verifyAccessToken(tokens.signAccessToken('test-user'))
    expect(first.sub).toBe('test-user')
    expect(first.exp - first.iat).toBe(900)
    expect(second.jti).not.toBe(first.jti)
  })

  it('rejects invalid claims and unexpected signing algorithms', () => {
    const missingUser = jwt.sign({ jti: 'test' }, tokens.JWT_SECRET, {
      algorithm: 'HS512',
      expiresIn: 60
    })
    const wrongAlgorithm = jwt.sign(
      { sub: 'test', jti: 'test' },
      tokens.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: 60 }
    )
    expect(() => tokens.verifyAccessToken(missingUser)).toThrow()
    expect(() => tokens.verifyAccessToken(wrongAlgorithm)).toThrow()
    expect(() => tokens.signAccessToken('')).toThrow()
  })

  it('keeps refresh credentials opaque and stores only their digest', () => {
    const secret = tokens.generateRefreshToken()
    expect(Buffer.from(secret, 'base64url')).toHaveLength(64)
    expect(tokens.hashToken(secret)).toMatch(/^[a-f0-9]{64}$/)
    expect(tokens.hashToken(secret)).not.toBe(
      tokens.hashToken(tokens.generateRefreshToken())
    )
  })
})
