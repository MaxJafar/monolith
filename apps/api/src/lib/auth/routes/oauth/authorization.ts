import { z } from 'zod'

import { CORS_ALLOWED_ORIGINS } from '../../../../core/routes/constants/corsAllowedOrigins'
import { getCookieOptions } from '../../constants/cookie'
import endpoints from '../../endpoints'
import { create2FASession } from '../../utils/2fa'
import { fetchUserEmail, getProvider } from '../../utils/oauth'
import { createOAuthChallenges } from '../../utils/oauthState'
import { storeRefreshToken } from '../../utils/refreshTokenStore'
import {
  generateFamily,
  generateRefreshToken,
  signAccessToken
} from '../../utils/tokens'

const challenges = createOAuthChallenges()
const providerName = z.string().min(1).max(64)
const originAllowed = (origin: string | undefined): origin is string =>
  !!origin && CORS_ALLOWED_ORIGINS.includes(origin)

export const authorize = endpoints
  .query({
    description: 'Create a provider sign-in challenge',
    noAuth: true,
    encrypted: false,
    input: { query: z.object({ provider: providerName }) },
    output: { OK: z.object({ url: z.string(), state: z.string() }) }
  })
  .callback(async ({ query, req, response }) => {
    const origin = req.headers.origin

    if (!originAllowed(origin)) return response.badRequest('Invalid origin')

    const adapter = await getProvider(query.provider, origin)

    if (!adapter)
      return response.badRequest('Provider not supported or not configured')

    const challenge = challenges.issue(query.provider, origin)

    return response.ok({
      url: adapter.client
        .authorize(challenge.state, challenge.verifier)
        .toString(),
      state: challenge.state
    })
  })

export const verify = endpoints
  .mutation({
    description: 'Complete a single-use provider sign-in challenge',
    noAuth: true,
    encrypted: false,
    input: {
      body: z.object({
        provider: providerName,
        code: z.string().min(1).max(4096),
        state: z.string().min(1).max(512)
      })
    },
    output: {
      OK: z.union([
        z.object({ accessToken: z.string() }),
        z.object({ state: z.literal('2fa_required'), tid: z.string() })
      ])
    }
  })
  .callback(async ({ body, db, req, res, response }) => {
    const origin = req.headers.origin

    if (!originAllowed(origin)) return response.badRequest('Invalid origin')

    const challenge = challenges.consume(body.state, body.provider, origin)

    if (!challenge) return response.badRequest('Invalid or expired state')

    const adapter = await getProvider(body.provider, origin)

    if (!adapter)
      return response.badRequest('Provider not supported or not configured')
    let email: string | null

    try {
      const tokens = await adapter.client.exchange(
        body.code,
        challenge.verifier
      )
      email = await fetchUserEmail(body.provider, tokens)
    } catch {
      return response.unauthorized()
    }
    if (!email) return response.unauthorized()

    const account = await db.query.users.findFirst({ where: { email } })

    if (!account) return response.unauthorized()
    if (account.twoFASecret)
      return response.ok({
        state: '2fa_required',
        tid: await create2FASession(account.id)
      })

    const accessToken = signAccessToken(account.id)
    const refreshToken = generateRefreshToken()
    await storeRefreshToken({
      userId: account.id,
      token: refreshToken,
      family: generateFamily(),
      ip: req.ip || req.socket.remoteAddress || '127.0.0.1'
    })
    const cookie = getCookieOptions(req)
    res.cookie('refresh_token', refreshToken, cookie)
    res.cookie('access_token', accessToken, {
      ...cookie,
      path: '/',
      maxAge: 900_000
    })

    return response.ok({ accessToken })
  })
