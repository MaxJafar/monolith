import jwt from 'jsonwebtoken'
import { createHash, randomBytes, randomUUID } from 'node:crypto'

function signingKey(): string {
  const value = process.env.JWT_SIGNING_KEY
  if (!value)
    throw new Error(
      'JWT_SIGNING_KEY is required to issue and verify Monolith sessions'
    )
  return value
}

export const JWT_SECRET = signingKey()
export const ACCESS_TOKEN_DURATION = 900
export const REFRESH_TOKEN_BYTES = 64
const DAY = 86_400_000
export const REFRESH_TOKEN_EXPIRY_MS = 7 * DAY
export const MAX_SESSION_AGE_MS = 60 * DAY

export interface AccessTokenPayload {
  sub: string
  jti: string
  iat: number
  exp: number
}

export function signAccessToken(userId: string): string {
  if (!userId) throw new TypeError('A session requires a user ID')
  return jwt.sign({ jti: randomUUID() }, JWT_SECRET, {
    subject: userId,
    algorithm: 'HS512',
    expiresIn: ACCESS_TOKEN_DURATION
  })
}

export function verifyAccessToken(encoded: string): AccessTokenPayload {
  const claims = jwt.verify(encoded, JWT_SECRET, { algorithms: ['HS512'] })
  if (
    typeof claims === 'string' ||
    typeof claims.sub !== 'string' ||
    !claims.sub ||
    typeof claims.jti !== 'string' ||
    !claims.jti ||
    !Number.isSafeInteger(claims.iat) ||
    !Number.isSafeInteger(claims.exp)
  )
    throw new jwt.JsonWebTokenError('Session token has invalid claims')
  return claims as AccessTokenPayload
}

export const generateFamily = (): string => randomUUID()
export const generateRefreshToken = (): string =>
  randomBytes(REFRESH_TOKEN_BYTES).toString('base64url')
export const hashToken = (value: string): string =>
  createHash('sha256').update(value).digest('hex')
export const getRefreshTokenExpiry = (): number =>
  Date.now() + REFRESH_TOKEN_EXPIRY_MS
export const getMaxSessionExpiry = (): number => Date.now() + MAX_SESSION_AGE_MS
