import { v4 } from 'uuid'
import z from 'zod'

import { getCookieOptions, setRefreshCookie } from '../constants/cookie'
import endpoints from '../endpoints'
import { sessions } from '../utils/qrLogin'
import { storeRefreshToken } from '../utils/refreshTokenStore'
import {
  generateFamily,
  generateRefreshToken,
  signAccessToken
} from '../utils/tokens'

export const register = endpoints
  .mutation({
    description: 'Register a new QR login session',
    noAuth: true,
    encrypted: false,
    input: {
      body: z.object({
        browserInfo: z.string()
      })
    },
    output: {
      CREATED: z.object({
        sessionId: z.string(),
        expiresAt: z.string()
      })
    }
  })
  .callback(async ({ body: { browserInfo }, response }) => {
    const sessionId = v4()

    sessions.set(sessionId, {
      sessionId,
      browserInfo,
      status: 'pending',
      accessToken: '',
      refreshToken: '',
      userId: ''
    })

    return response.created({
      sessionId,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    })
  })

export const approve = endpoints
  .mutation({
    description: 'Approve a QR login request from an authenticated device',
    encrypted: false,
    input: {
      body: z.object({
        sessionId: z.string().uuid()
      })
    },
    output: {
      OK: z.object({
        browserInfo: z.string()
      })
    }
  })
  .callback(async ({ res, db, body: { sessionId }, req, response }) => {
    const session = sessions.get(sessionId)

    if (!session) {
      return response.notFound()
    }

    if (session.status === 'approved') {
      return response.badRequest('Session already approved')
    }

    const user = await db.query.users.findFirst({
      where: { id: res.locals.userId as string }
    })

    if (!user) {
      return response.unauthorized()
    }

    // The user lookup yields; another device may approve or consume this QR
    // session before it returns. Recheck and choose the account synchronously.
    const current = sessions.get(sessionId)

    if (!current || current !== session) return response.notFound()
    if (current.status !== 'pending')
      return response.badRequest('Session already approved')

    const accessToken = signAccessToken(user.id)

    current.status = 'approved'
    current.userId = user.id
    current.accessToken = accessToken

    const io = req.io

    if (io) {
      io.of('/qr-login')
        .to(`qr-session:${sessionId}`)
        .emit('sessionApproved', { accessToken })
    }

    return response.ok({
      browserInfo: session.browserInfo
    })
  })

export const status = endpoints
  .query({
    description: 'Check QR login session status',
    noAuth: true,
    encrypted: false,
    input: {
      query: z.object({
        sessionId: z.string().uuid()
      })
    },
    output: {
      OK: z.union([
        z.object({
          status: z.literal('pending'),
          expiresAt: z.string()
        }),
        z.object({
          status: z.literal('approved'),
          accessToken: z.string()
        }),
        z.object({
          status: z.literal('expired')
        }),
        z.object({
          status: z.literal('not_found')
        })
      ])
    }
  })
  .callback(async ({ query: { sessionId }, response }) => {
    const session = sessions.get(sessionId)

    if (!session) {
      return response.ok({ status: 'not_found' as const })
    }

    if (session.status === 'approved') {
      const { accessToken } = session

      return response.ok({
        status: 'approved' as const,
        accessToken
      })
    }

    return response.ok({
      status: 'pending' as const,
      expiresAt: new Date(
        sessions.expiryTime(sessionId) ?? Date.now()
      ).toISOString()
    })
  })

export const claim = endpoints
  .mutation({
    description: 'Claim approved QR login session and set auth cookie',
    noAuth: true,
    encrypted: false,
    input: {
      body: z.object({
        sessionId: z.string().uuid()
      })
    },
    output: {
      OK: z.object({
        accessToken: z.string()
      })
    }
  })
  .callback(async ({ body: { sessionId }, req, res, response }) => {
    const session = sessions.get(sessionId)

    if (!session || session.status !== 'approved' || !session.userId) {
      return response.notFound()
    }

    // Consume before awaiting persistence so simultaneous claims cannot each
    // create a session. Refresh credentials bind to the receiving browser.
    sessions.del(sessionId)
    const accessToken = signAccessToken(session.userId)
    const refreshToken = generateRefreshToken()
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1'

    await storeRefreshToken({
      userId: session.userId,
      token: refreshToken,
      family: generateFamily(),
      ip
    })

    setRefreshCookie(req, res, refreshToken)
    res.cookie('access_token', accessToken, {
      ...getCookieOptions(req),
      path: '/',
      maxAge: 15 * 60 * 1000
    })

    return response.ok({ accessToken })
  })
