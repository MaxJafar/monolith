import z from 'zod'

import { getCookieOptions, setRefreshCookie } from '../constants/cookie'
import endpoints from '../endpoints'
import {
  findToken,
  revokeFamily,
  rotateToken
} from '../utils/refreshTokenStore'
import { generateRefreshToken, signAccessToken } from '../utils/tokens'

export const refresh = endpoints
  .mutation({
    description: 'Refresh access token using refresh token cookie',
    noAuth: true,
    encrypted: false,
    input: {},
    output: {
      OK: z.object({
        accessToken: z.string()
      })
    }
  })
  .callback(async ({ db, req, res, response }) => {
    const refreshToken = req.cookies?.refresh_token as string | undefined

    if (!refreshToken) {
      return response.unauthorized()
    }

    const record = await findToken(refreshToken)

    if (!record) {
      return response.unauthorized()
    }

    if (record.revoked) {
      await revokeFamily(record.family)

      return response.unauthorized()
    }

    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1'

    if (record.bound_ip !== ip) {
      await revokeFamily(record.family)

      return response.unauthorized()
    }

    const now = Date.now()

    if (new Date(record.expires_at).getTime() < now) {
      return response.unauthorized()
    }

    const user = await db.query.users.findFirst({
      where: { id: record.userId }
    })

    if (!user) {
      return response.unauthorized()
    }

    const accessToken = signAccessToken(user.id)
    const newRefreshToken = generateRefreshToken()

    const rotated = await rotateToken({
      oldTokenHash: record.token_hash,
      newToken: newRefreshToken,
      ip,
      family: record.family
    })

    if (!rotated) return response.unauthorized()

    setRefreshCookie(req, res, newRefreshToken)
    res.cookie('access_token', accessToken, {
      ...getCookieOptions(req),
      path: '/',
      maxAge: 15 * 60 * 1000
    })

    return response.ok({ accessToken })
  })
