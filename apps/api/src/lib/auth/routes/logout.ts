import z from 'zod'

import { getClearCookieOptions } from '../constants/cookie'
import endpoints from '../endpoints'
import { findToken, revokeFamily } from '../utils/refreshTokenStore'

export const logout = endpoints
  .mutation({
    description: 'Invalidate refresh token and clear session',
    noAuth: true,
    encrypted: false,
    input: {},
    output: {
      OK: z.boolean()
    }
  })
  .callback(async ({ req, res, response }) => {
    const refreshToken = req.cookies?.refresh_token as string | undefined

    res.cookie('access_token', '', { ...getClearCookieOptions(req), path: '/' })
    res.cookie('refresh_token', '', getClearCookieOptions(req))

    if (!refreshToken) {
      return response.unauthorized()
    }

    const record = await findToken(refreshToken)

    if (!record) {
      return response.unauthorized()
    }

    await revokeFamily(record.family)

    return response.ok(true)
  })
