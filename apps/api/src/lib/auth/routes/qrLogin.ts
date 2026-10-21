// SPDX-License-Identifier: 0BSD
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

import endpoints from '../endpoints'
import { QR_SESSION_SECONDS, sessions } from '../utils/qrLogin'
import { issueBrowserSession } from '../utils/signInSession'
import { signAccessToken } from '../utils/tokens'

const sessionInput = z.object({ sessionId: z.uuid() })
export const register = endpoints
  .mutation({
    description: 'Create a short-lived QR sign-in request',
    noAuth: true,
    encrypted: false,
    input: { body: z.object({ browserInfo: z.string() }) },
    output: {
      CREATED: z.object({ sessionId: z.string(), expiresAt: z.string() })
    }
  })
  .callback(async ({ body, response }) => {
    const id = randomUUID()
    sessions.set(id, {
      sessionId: id,
      browserInfo: body.browserInfo,
      status: 'pending',
      userId: '',
      accessToken: '',
      refreshToken: ''
    })
    return response.created({
      sessionId: id,
      expiresAt: new Date(
        sessions.expiryTime(id) ?? Date.now() + QR_SESSION_SECONDS * 1000
      ).toISOString()
    })
  })

export const approve = endpoints
  .mutation({
    description: 'Confirm the account for a QR sign-in request',
    encrypted: false,
    input: { body: sessionInput },
    output: { OK: z.object({ browserInfo: z.string() }) }
  })
  .callback(async ({ body, db, req, res, response }) => {
    const id = body.sessionId
    const pending = sessions.get(id)
    if (!pending) return response.notFound()
    if (pending.status !== 'pending')
      return response.badRequest('Session already approved')
    const account = await db.query.users.findFirst({
      where: { id: res.locals.userId as string }
    })
    if (!account) return response.unauthorized()
    if (sessions.get(id) !== pending) return response.notFound()
    if (pending.status !== 'pending')
      return response.badRequest('Session already approved')
    const accessToken = signAccessToken(account.id)
    Object.assign(pending, {
      status: 'approved',
      userId: account.id,
      accessToken
    })
    req.io
      ?.of('/qr-login')
      .to('qr-session:' + id)
      .emit('sessionApproved', { accessToken })
    return response.ok({ browserInfo: pending.browserInfo })
  })

export const status = endpoints
  .query({
    description: 'Read the state of a QR sign-in request',
    noAuth: true,
    encrypted: false,
    input: { query: sessionInput },
    output: {
      OK: z.union([
        z.object({ status: z.literal('pending'), expiresAt: z.string() }),
        z.object({ status: z.literal('approved'), accessToken: z.string() }),
        z.object({ status: z.literal('expired') }),
        z.object({ status: z.literal('not_found') })
      ])
    }
  })
  .callback(async ({ query, response }) => {
    const saved = sessions.get(query.sessionId)
    if (!saved) return response.ok({ status: 'not_found' })
    return saved.status === 'approved'
      ? response.ok({ status: 'approved', accessToken: saved.accessToken })
      : response.ok({
          status: 'pending',
          expiresAt: new Date(
            sessions.expiryTime(query.sessionId) ?? Date.now()
          ).toISOString()
        })
  })

export const claim = endpoints
  .mutation({
    description: 'Consume an approved QR request on the receiving browser',
    noAuth: true,
    encrypted: false,
    input: { body: sessionInput },
    output: { OK: z.object({ accessToken: z.string() }) }
  })
  .callback(async ({ body, req, res, response }) => {
    const saved = sessions.get(body.sessionId)
    if (!saved?.userId || saved.status !== 'approved')
      return response.notFound()
    sessions.del(body.sessionId)
    return response.ok(await issueBrowserSession(saved.userId, req, res))
  })
