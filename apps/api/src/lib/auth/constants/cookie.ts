import type { CookieOptions, Request } from 'express'

function options(request: Request, expires: boolean): CookieOptions {
  const secure = Boolean(
    request.secure ||
    request.protocol === 'https' ||
    process.env.NODE_ENV === 'production'
  )
  return {
    path: '/auth',
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    maxAge: expires ? 0 : 604800000
  }
}
export const getCookieOptions = (request: Request) => options(request, false)
export const getClearCookieOptions = (request: Request) =>
  options(request, true)
