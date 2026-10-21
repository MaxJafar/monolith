// SPDX-License-Identifier: 0BSD
import { z } from 'zod'

import endpoints from '../endpoints'
import {
  findToken,
  revokeFamily,
  rotateToken
} from '../utils/refreshTokenStore'
import { requestAddress, writeSessionCookies } from '../utils/signInSession'
import { generateRefreshToken, signAccessToken } from '../utils/tokens'

export const refresh = endpoints
  .mutation({
    description: 'Exchange a valid refresh credential for the next session',
    noAuth: true,
    encrypted: false,
    input: {},
    output: { OK: z.object({ accessToken: z.string() }) }
  })
  .callback(async ({ req, res, db, response }) => {
    const credential: unknown = req.cookies?.refresh_token
    const stored =
      typeof credential === 'string' && credential
        ? await findToken(credential)
        : null
    if (!stored) return response.unauthorized()
    const ip = requestAddress(req)
    if (stored.revoked || stored.bound_ip !== ip) {
      await revokeFamily(stored.family)
      return response.unauthorized()
    }
    if (stored.expires_at.getTime() <= Date.now())
      return response.unauthorized()
    const account = await db.query.users.findFirst({
      where: { id: stored.userId }
    })
    if (!account) return response.unauthorized()
    const next = generateRefreshToken()
    const accessToken = signAccessToken(account.id)
    if (
      !(await rotateToken({
        oldTokenHash: stored.token_hash,
        newToken: next,
        ip,
        family: stored.family
      }))
    ) {
      return response.unauthorized()
    }
    writeSessionCookies(req, res, accessToken, next)
    return response.ok({ accessToken })
  })
