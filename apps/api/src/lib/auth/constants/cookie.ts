import type { CookieOptions, Request, Response } from 'express'

function options(request: Request, expires: boolean): CookieOptions {
  const secure = Boolean(
    request.secure ||
    request.protocol === 'https' ||
    process.env.NODE_ENV === 'production'
  )
  return {
    // Hosted clients reach auth through /api/auth; direct clients use /auth.
    path: '/',
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    maxAge: expires ? 0 : 604800000
  }
}
export const getCookieOptions = (request: Request) => options(request, false)
export const getClearCookieOptions = (request: Request) =>
  options(request, true)

export function setRefreshCookie(
  request: Request,
  response: Response,
  token: string
) {
  response.cookie('refresh_token', token, getCookieOptions(request))
  // Remove the older, more-specific cookie so direct clients cannot send a
  // stale value ahead of the replacement at the root path.
  response.cookie('refresh_token', '', {
    ...getClearCookieOptions(request),
    path: '/auth'
  })
}
