import { and, eq, gt, lt } from 'drizzle-orm'

import { db } from '../../../core/drizzle'
import { authRefreshTokens } from '../schema.drizzle'
import { hashToken } from './tokens'

export async function storeRefreshToken(params: {
  userId: string
  token: string
  family: string
  ip: string
}): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await db.insert(authRefreshTokens).values({
    userId: params.userId,
    token_hash: hashToken(params.token),
    family: params.family,
    bound_ip: params.ip,
    last_ip: params.ip,
    expires_at: expiresAt,
    revoked: false,
    last_used_at: new Date()
  })
}

export async function findToken(
  token: string
): Promise<typeof authRefreshTokens.$inferSelect | null> {
  const tokenHash = hashToken(token)

  const record = await db.query.authRefreshTokens.findFirst({
    where: { token_hash: tokenHash }
  })

  return record ?? null
}

export async function rotateToken(params: {
  oldTokenHash: string
  newToken: string
  ip: string
  family: string
}): Promise<boolean> {
  return db.transaction(async transaction => {
    const [oldRecord] = await transaction
      .update(authRefreshTokens)
      .set({
        revoked: true,
        last_used_at: new Date(),
        last_ip: params.ip,
        updated: new Date()
      })
      .where(
        and(
          eq(authRefreshTokens.token_hash, params.oldTokenHash),
          eq(authRefreshTokens.family, params.family),
          eq(authRefreshTokens.bound_ip, params.ip),
          eq(authRefreshTokens.revoked, false),
          gt(authRefreshTokens.expires_at, new Date())
        )
      )
      .returning()

    if (!oldRecord) return false

    await transaction.insert(authRefreshTokens).values({
      userId: oldRecord.userId,
      token_hash: hashToken(params.newToken),
      family: oldRecord.family,
      bound_ip: params.ip,
      last_ip: params.ip,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revoked: false,
      last_used_at: new Date()
    })

    return true
  })
}

export async function revokeFamily(family: string): Promise<void> {
  await db
    .update(authRefreshTokens)
    .set({ revoked: true, updated: new Date() })
    .where(eq(authRefreshTokens.family, family))
}

export async function cleanupExpired(): Promise<void> {
  const now = new Date()

  await db
    .update(authRefreshTokens)
    .set({ revoked: true, updated: new Date() })
    .where(
      and(
        lt(authRefreshTokens.expires_at, now),
        eq(authRefreshTokens.revoked, false)
      )
    )
}
