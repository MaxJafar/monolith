import type { Request, Response } from 'express'
import { afterEach, expect, it, vi } from 'vitest'

import {
  getClearCookieOptions,
  getCookieOptions,
  setRefreshCookie
} from '../lib/auth/constants/cookie'

afterEach(() => vi.unstubAllEnvs())

it('makes refresh cookies available to both gateway and direct API auth routes', () => {
  vi.stubEnv('NODE_ENV', 'production')
  const request = { secure: false, protocol: 'http' } as Request
  const settings = getCookieOptions(request)
  expect(settings).toMatchObject({
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  })
  expect(getClearCookieOptions(request)).toMatchObject({
    ...settings,
    maxAge: 0
  })
  const cookie = vi.fn()
  setRefreshCookie(
    request,
    { cookie } as unknown as Response,
    'synthetic-refresh-token'
  )
  expect(cookie.mock.calls).toEqual([
    ['refresh_token', 'synthetic-refresh-token', settings],
    ['refresh_token', '', { ...settings, path: '/auth', maxAge: 0 }]
  ])
})
