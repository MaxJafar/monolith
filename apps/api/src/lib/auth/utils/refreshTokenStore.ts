// SPDX-License-Identifier: 0BSD
import { and, eq, gt, lte } from 'drizzle-orm'

import { db } from '../../../core/drizzle'
import { authRefreshTokens as sessions } from '../schema.drizzle'
import { REFRESH_TOKEN_EXPIRY_MS, hashToken } from './tokens'

type NewSession = { userId: string; token: string; family: string; ip: string }
type Rotation = {
  oldTokenHash: string
  newToken: string
  ip: string
  family: string
}

function sessionValues(input: NewSession, time: Date) {
  return {
    userId: input.userId,
    family: input.family,
    token_hash: hashToken(input.token),
    bound_ip: input.ip,
    last_ip: input.ip,
    last_used_at: time,
    expires_at: new Date(time.getTime() + REFRESH_TOKEN_EXPIRY_MS),
    revoked: false
  }
}

/** A rotation claims the old credential and inserts its successor in one transaction. */
export function createRefreshTokenStore(database: typeof db) {
  return {
    async store(input: NewSession): Promise<void> {
      await database.insert(sessions).values(sessionValues(input, new Date()))
    },
    async find(token: string): Promise<typeof sessions.$inferSelect | null> {
      const [row] = await database
        .select()
        .from(sessions)
        .where(eq(sessions.token_hash, hashToken(token)))
        .limit(1)
      return row ?? null
    },
    async rotate(input: Rotation): Promise<boolean> {
      return database.transaction(async transaction => {
        const now = new Date()
        const claimed = await transaction
          .update(sessions)
          .set({
            revoked: true,
            last_ip: input.ip,
            last_used_at: now,
            updated: now
          })
          .where(
            and(
              eq(sessions.token_hash, input.oldTokenHash),
              eq(sessions.family, input.family),
              eq(sessions.bound_ip, input.ip),
              eq(sessions.revoked, false),
              gt(sessions.expires_at, now)
            )
          )
          .returning({ userId: sessions.userId, family: sessions.family })
        const previous = claimed[0]
        if (!previous) return false
        await transaction.insert(sessions).values(
          sessionValues(
            {
              userId: previous.userId,
              family: previous.family,
              token: input.newToken,
              ip: input.ip
            },
            now
          )
        )
        return true
      })
    },
    async revoke(family: string): Promise<void> {
      await database
        .update(sessions)
        .set({ revoked: true, updated: new Date() })
        .where(eq(sessions.family, family))
    },
    async expire(): Promise<void> {
      const now = new Date()
      await database
        .update(sessions)
        .set({ revoked: true, updated: now })
        .where(and(eq(sessions.revoked, false), lte(sessions.expires_at, now)))
    }
  }
}

// Resolve the live database on each call so add-on reloads retain the current schema.
export const storeRefreshToken = (input: NewSession) =>
  createRefreshTokenStore(db).store(input)
export const findToken = (token: string) =>
  createRefreshTokenStore(db).find(token)
export const rotateToken = (input: Rotation) =>
  createRefreshTokenStore(db).rotate(input)
export const revokeFamily = (family: string) =>
  createRefreshTokenStore(db).revoke(family)
export const cleanupExpired = () => createRefreshTokenStore(db).expire()
