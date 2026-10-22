import { afterEach, describe, expect, it, vi } from 'vitest'

import { oauthProvider } from '../lib/auth/constants/oauth_providers'
import { remove, toggle, upsert } from '../lib/auth/routes/oauth/providers'
import { createOAuthChallenges } from '../lib/auth/utils/oauthState'
import { canManageSignIn } from '../lib/auth/utils/signInAdmins'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

type Context = Parameters<ReturnType<typeof remove.getValue>['callback']>[0]

const call = (
  route: typeof remove,
  userId: string,
  db: unknown,
  query: Record<string, string>,
  body?: unknown
) =>
  route.getValue().callback({
    db,
    query,
    body,
    res: { locals: { userId } }
  } as unknown as Context)

describe('sign-in provider administration', () => {
  const untouched = new Proxy(
    {},
    {
      get: () => {
        throw new Error('Rejected requests must not reach the database')
      }
    }
  )

  it('fails closed until host administrators are configured', () => {
    expect(canManageSignIn('owner')).toBe(false)
    vi.stubEnv('MONOLITH_AUTH_ADMIN_IDS', ' first , owner ')
    expect(canManageSignIn('owner')).toBe(true)
    expect(canManageSignIn('')).toBe(false)
  })

  it('forbids every change by an account outside the administrator list', async () => {
    vi.stubEnv('MONOLITH_AUTH_ADMIN_IDS', 'owner')
    for (const [route, query, body] of [
      [upsert, { provider: 'google' }, { clientId: 'id', clientSecret: 'x' }],
      [toggle, { id: 'provider' }],
      [remove, { id: 'provider' }]
    ] as const)
      expect(
        (await call(route, 'viewer', untouched, query, body)).$status
      ).toBe(403)
  })

  it('lets a listed administrator remove a provider', async () => {
    vi.stubEnv('MONOLITH_AUTH_ADMIN_IDS', 'owner')
    const db = {
      delete: () => ({
        where: () => ({ returning: async () => [{ id: 'provider' }] })
      })
    }
    expect((await call(remove, 'owner', db, { id: 'provider' })).$status).toBe(
      204
    )
  })
})

describe('OAuth challenge binding', () => {
  it('binds state to its provider and origin and consumes it once', () => {
    const states = createOAuthChallenges()
    const challenge = states.issue('google', 'https://workspace.test')
    expect(
      states.consume(challenge.state, 'github', 'https://workspace.test')
    ).toBeNull()
    expect(
      states.consume(challenge.state, 'google', 'https://other.test')
    ).toBeNull()
    expect(
      states.consume(challenge.state, 'google', 'https://workspace.test')
        ?.verifier
    ).toBe(challenge.verifier)
    expect(
      states.consume(challenge.state, 'google', 'https://workspace.test')
    ).toBeNull()
  })

  it('expires abandoned challenges', () => {
    let time = 0

    const states = createOAuthChallenges(() => time)
    const { state } = states.issue('google', 'https://workspace.test')
    time = 300_000
    expect(states.consume(state, 'google', 'https://workspace.test')).toBeNull()
  })
})

describe('verified provider identities', () => {
  it('does not resolve inherited object property names as providers', () => {
    expect(oauthProvider('constructor')).toBeUndefined()
    expect(oauthProvider('__proto__')).toBeUndefined()
  })

  it('requires a verified Google email from the authenticated user-info endpoint', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ email: 'member@example.com', email_verified: false })
      )
      .mockResolvedValueOnce(
        Response.json({ email: 'member@example.com', email_verified: true })
      )
    vi.stubGlobal('fetch', fetch)
    expect(await oauthProvider('google')!.email('token')).toBeNull()
    expect(await oauthProvider('google')!.email('token')).toBe(
      'member@example.com'
    )
    expect(fetch.mock.calls[0]![1].headers.Authorization).toBe('Bearer token')
  })

  it('selects only a verified primary GitHub email', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json([
          { email: 'unverified@example.com', primary: true, verified: false },
          { email: 'secondary@example.com', primary: false, verified: true },
          { email: 'primary@example.com', primary: true, verified: true }
        ])
      )
    )
    expect(await oauthProvider('github')!.email('token')).toBe(
      'primary@example.com'
    )
  })

  it('retains Google PKCE and the configured redirect URI', () => {
    const url = oauthProvider('google')!
      .create('id', 'secret', 'https://workspace.test/auth')
      .authorize('state', 'verifier')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://workspace.test/auth'
    )
    expect(url.searchParams.get('state')).toBe('state')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
  })
})
