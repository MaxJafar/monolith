// SPDX-License-Identifier: 0BSD
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { users } from '../../user/schema.drizzle'
import endpoints from '../endpoints'
import { create2FASession } from '../utils/2fa'
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  recordFailedLogin
} from '../utils/loginRateLimiter'
import { verifyPassword } from '../utils/password'
import { issueBrowserSession, requestAddress } from '../utils/signInSession'

export const login = endpoints
  .mutation({
    description: 'Sign in with an existing account',
    noAuth: true,
    encrypted: false,
    input: {
      body: z.object({ email: z.email(), password: z.string().min(1) })
    },
    output: {
      OK: z.union([
        z.object({ accessToken: z.string() }),
        z.object({ state: z.literal('2fa_required'), tid: z.string() })
      ])
    }
  })
  .callback(async ({ body, db, req, res, response }) => {
    const address = requestAddress(req)
    if (!checkLoginRateLimit(address)) return response.unauthorized()
    const account = await db.query.users.findFirst({
      where: { email: body.email }
    })
    const originalHash = account?.auth_password_hash
    const password = originalHash
      ? await verifyPassword(originalHash, body.password)
      : { valid: false, replacement: undefined }
    if (!account || !originalHash || !password.valid) {
      recordFailedLogin(address)
      return response.unauthorized()
    }
    clearLoginRateLimit(address)
    if (password.replacement) {
      await db
        .update(users)
        .set({ auth_password_hash: password.replacement })
        .where(
          and(
            eq(users.id, account.id),
            eq(users.auth_password_hash, originalHash)
          )
        )
    }
    if (account.twoFASecret) {
      return response.ok({
        state: '2fa_required',
        tid: await create2FASession(account.id)
      })
    }
    return response.ok(await issueBrowserSession(account.id, req, res))
  })
