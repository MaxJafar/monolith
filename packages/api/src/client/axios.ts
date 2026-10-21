// SPDX-License-Identifier: 0BSD
import axios, { type AxiosRequestConfig } from 'axios'

import { nativeAxiosAdapter } from '../desktop/axiosAdapter'
import { getNativeRuntime } from '../desktop/runtime'
import { withSessionRefreshLock } from './refreshLock'
import { copyHeaders } from './response'
import {
  clearAccessToken,
  getAccessToken,
  getAccessTokenRevision,
  setAccessToken
} from './tokenStore'

const refreshing = new Map<string, Promise<boolean>>()
type RetriableRequest = AxiosRequestConfig & { _retry?: boolean }

async function refreshCookieSession(host: string): Promise<boolean> {
  const prior = getAccessTokenRevision()
  try {
    const response = await fetch(host.replace(/\/+$/, '') + '/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    })
    const result = await response.json().catch(() => null)
    if (getAccessTokenRevision() !== prior) return Boolean(getAccessToken())
    const next: unknown = result?.data?.accessToken
    if (
      response.ok &&
      result?.state === 'success' &&
      typeof next === 'string' &&
      next
    ) {
      setAccessToken(next)
      return true
    }
    if (response.status === 401 || response.status === 403) clearAccessToken()
  } catch {
    // Connectivity failures leave the current session available for a later retry.
  }
  return false
}

export function refreshAccessToken(apiHost: string): Promise<boolean> {
  const desktop = getNativeRuntime()
  if (desktop) return desktop.transport.refresh()
  const host = apiHost.replace(/\/+$/, '')
  const current = refreshing.get(host)
  if (current) return current
  const request = withSessionRefreshLock(() => refreshCookieSession(host))
    .catch(() => false)
    .finally(() => {
      if (refreshing.get(host) === request) refreshing.delete(host)
    })
  refreshing.set(host, request)
  return request
}

function eligibleForRefresh(
  request: RetriableRequest,
  status?: number
): boolean {
  if (status !== 401 || request._retry || !request.url) return false
  const pathname = request.url.split(/[?#]/, 1)[0]?.replace(/\/+$/, '') ?? ''
  return !['login', 'logout', 'refresh'].some(name =>
    pathname.endsWith('/auth/' + name)
  )
}

export function createAxiosInstance(apiHost: string, isExternal: boolean) {
  const client = axios.create({
    withCredentials: true,
    baseURL: isExternal ? undefined : apiHost,
    ...(!isExternal && getNativeRuntime()
      ? { adapter: nativeAxiosAdapter }
      : {})
  })
  client.interceptors.request.use(request => {
    if (!isExternal) {
      request.headers.set('X-Monolith-Package-Names', '1')
      const token = getAccessToken()
      if (token) request.headers.set('Authorization', 'Bearer ' + token)
    }
    return request
  })
  client.interceptors.response.use(undefined, async (error: unknown) => {
    if (
      isExternal ||
      !error ||
      typeof error !== 'object' ||
      !('config' in error) ||
      !error.config
    )
      throw error
    const request = error.config as RetriableRequest
    const status =
      'response' in error
        ? (error.response as { status?: number } | undefined)?.status
        : undefined
    if (!eligibleForRefresh(request, status)) throw error
    const headers = copyHeaders(request.headers)
    const authorization = headers.get('Authorization')
    const sent =
      typeof authorization === 'string'
        ? authorization.replace(/^Bearer\s+/i, '')
        : null
    const current = getAccessToken()
    // A cleared token after an authenticated request means the user signed out.
    if (sent && !current) throw error
    if (!current || current === sent) {
      if (!(await refreshAccessToken(apiHost))) throw error
    }
    const token = getAccessToken()
    if (!token) throw error
    headers.set('Authorization', 'Bearer ' + token)
    return client.request({
      ...request,
      headers,
      _retry: true
    } as RetriableRequest)
  })
  return client
}
