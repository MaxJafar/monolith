// SPDX-License-Identifier: 0BSD
import { z } from 'zod'

import endpoints from '../endpoints'
import { findToken, revokeFamily } from '../utils/refreshTokenStore'
import { clearSessionCookies } from '../utils/signInSession'

export const logout = endpoints
  .mutation({
    description: 'End the browser session and revoke its refresh family',
    noAuth: true,
    encrypted: false,
    input: {},
    output: { OK: z.boolean() }
  })
  .callback(async ({ req, res, response }) => {
    clearSessionCookies(req, res)
    const value: unknown = req.cookies?.refresh_token
    const session =
      typeof value === 'string' && value ? await findToken(value) : null
    if (!session) return response.unauthorized()
    await revokeFamily(session.family)
    return response.ok(true)
  })
