// SPDX-License-Identifier: 0BSD
import type { Request, Response } from 'express'

import {
  getClearCookieOptions,
  getCookieOptions,
  setRefreshCookie
} from '../constants/cookie'
import { storeRefreshToken } from './refreshTokenStore'
import {
  ACCESS_TOKEN_DURATION,
  generateFamily,
  generateRefreshToken,
  signAccessToken
} from './tokens'

export function requestAddress(request: Request): string {
  return request.ip || request.socket.remoteAddress || '127.0.0.1'
}

export function writeSessionCookies(
  request: Request,
  response: Response,
  access: string,
  refresh: string
): void {
  setRefreshCookie(request, response, refresh)
  response.cookie('access_token', access, {
    ...getCookieOptions(request),
    path: '/',
    maxAge: ACCESS_TOKEN_DURATION * 1000
  })
}

export function clearSessionCookies(
  request: Request,
  response: Response
): void {
  const expired = getClearCookieOptions(request)
  for (const [name, path] of [
    ['access_token', '/'],
    ['refresh_token', '/'],
    ['refresh_token', '/auth']
  ]) {
    response.cookie(name!, '', { ...expired, path })
  }
}

export async function issueBrowserSession(
  userId: string,
  request: Request,
  response: Response
): Promise<{ accessToken: string }> {
  const accessToken = signAccessToken(userId)
  const token = generateRefreshToken()
  await storeRefreshToken({
    userId,
    token,
    family: generateFamily(),
    ip: requestAddress(request)
  })
  writeSessionCookies(request, response, accessToken, token)
  return { accessToken }
}
