// SPDX-License-Identifier: 0BSD
import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

import { users } from '../../user/schema.drizzle'
import endpoints from '../endpoints'
import { pending2FASessions, pendingTOTPSetups } from '../utils/2fa'
import {
  acceptsCode,
  createAuthenticator,
  openAuthenticator,
  sealAuthenticator
} from '../utils/authenticator'
import { issueBrowserSession } from '../utils/signInSession'

const challengeInput = { body: z.object({ otp: z.string(), tid: z.string() }) }
export const generate = endpoints
  .mutation({
    description: 'Prepare an authenticator for the signed-in account',
    encrypted: false,
    input: {},
    output: { OK: z.object({ tid: z.string(), link: z.string() }) }
  })
  .callback(async ({ db, res, response }) => {
    const account = await db.query.users.findFirst({
      where: { id: res.locals.userId as string }
    })
    if (!account) return response.unauthorized()
    const setup = createAuthenticator(account.email)
    const tid = randomUUID()
    pendingTOTPSetups.set(tid, { secret: setup.secret, userId: account.id })
    return response.ok({ tid, link: setup.link })
  })

export const enable = endpoints
  .mutation({
    description: 'Confirm an authenticator setup',
    encrypted: false,
    input: challengeInput,
    output: { NO_CONTENT: true }
  })
  .callback(async ({ body, db, res, response }) => {
    const setup = pendingTOTPSetups.get(body.tid)
    if (
      !setup ||
      setup.userId !== res.locals.userId ||
      !acceptsCode(setup.secret, body.otp)
    ) {
      return response.unauthorized()
    }
    const account = await db.query.users.findFirst({
      where: { id: setup.userId }
    })
    if (!account || pendingTOTPSetups.get(body.tid) !== setup)
      return response.unauthorized()
    const sealed = sealAuthenticator(setup.secret)
    pendingTOTPSetups.del(body.tid)
    await db
      .update(users)
      .set({ twoFASecret: sealed, updated: new Date() })
      .where(eq(users.id, account.id))
    return response.noContent()
  })

export const disable = endpoints
  .mutation({
    description: 'Remove the current account authenticator',
    encrypted: false,
    input: {},
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, response }) => {
    const updated = await db
      .update(users)
      .set({ twoFASecret: null, updated: new Date() })
      .where(eq(users.id, res.locals.userId as string))
      .returning({ id: users.id })
    return updated.length ? response.noContent() : response.unauthorized()
  })

export const verify = endpoints
  .mutation({
    description: 'Finish a pending sign-in with an authenticator code',
    noAuth: true,
    encrypted: false,
    input: challengeInput,
    output: { OK: z.object({ accessToken: z.string() }) }
  })
  .callback(async ({ body, db, req, res, response }) => {
    const challenge = pending2FASessions.get(body.tid)
    if (!challenge) return response.unauthorized()
    const account = await db.query.users.findFirst({
      where: { id: challenge.userId }
    })
    if (!account?.twoFASecret) return response.unauthorized()
    let valid = false
    try {
      valid = acceptsCode(openAuthenticator(account.twoFASecret), body.otp)
    } catch {
      /* An unreadable setup cannot authenticate. */
    }
    if (!valid || pending2FASessions.get(body.tid) !== challenge)
      return response.unauthorized()
    // Claim synchronously after the user lookup; concurrent requests cannot reuse this challenge.
    pending2FASessions.del(body.tid)
    return response.ok(await issueBrowserSession(account.id, req, res))
  })
