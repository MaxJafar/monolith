import { and, eq } from 'drizzle-orm'
import z from 'zod'

import { users } from '../../user/schema.drizzle'
import { getCookieOptions } from '../constants/cookie'
import endpoints from '../endpoints'
import { create2FASession } from '../utils/2fa'
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  recordFailedLogin
} from '../utils/loginRateLimiter'
import { verifyPassword } from '../utils/password'
import { storeRefreshToken } from '../utils/refreshTokenStore'
import {
  generateFamily,
  generateRefreshToken,
  signAccessToken
} from '../utils/tokens'

export const login = endpoints
  .mutation({
    description: 'Authenticate user with email and password',
    noAuth: true,
    encrypted: false,
    input: {
      body: z.object({
        email: z.string().email(),
        password: z.string().min(1)
      })
    },
    output: {
      OK: z.union([
        z.object({
          accessToken: z.string()
        }),
        z.object({
          state: z.literal('2fa_required'),
          tid: z.string()
        })
      ])
    }
  })
  .callback(async ({ db, body: { email, password }, req, res, response }) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1'

    if (!checkLoginRateLimit(ip)) {
      return response.unauthorized()
    }

    const user = await db.query.users.findFirst({
      where: { email }
    })

    if (!user) {
      recordFailedLogin(ip)

      return response.unauthorized()
    }

    const passwordHash = user.auth_password_hash

    if (!passwordHash) {
      recordFailedLogin(ip)

      return response.unauthorized()
    }

    const { valid, replacement } = await verifyPassword(passwordHash, password)

    if (!valid) {
      recordFailedLogin(ip)

      return response.unauthorized()
    }

    clearLoginRateLimit(ip)

    if (replacement) {
      await db
        .update(users)
        .set({ auth_password_hash: replacement })
        .where(
          and(eq(users.id, user.id), eq(users.auth_password_hash, passwordHash))
        )
    }

    if (user.twoFASecret) {
      const tid = await create2FASession(user.id)

      return response.ok({
        state: '2fa_required' as const,
        tid
      })
    }

    const accessToken = signAccessToken(user.id)
    const refreshToken = generateRefreshToken()
    const family = generateFamily()

    await storeRefreshToken({
      userId: user.id,
      token: refreshToken,
      family,
      ip
    })

    res.cookie('refresh_token', refreshToken, getCookieOptions(req))
    res.cookie('access_token', accessToken, {
      ...getCookieOptions(req),
      path: '/',
      maxAge: 15 * 60 * 1000
    })

    return response.ok({ accessToken })
  })
