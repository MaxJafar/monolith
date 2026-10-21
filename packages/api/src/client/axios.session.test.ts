// SPDX-License-Identifier: 0BSD
import {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig
} from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createAxiosInstance, refreshAccessToken } from './axios'
import { clearAccessToken, getAccessToken, setAccessToken } from './tokenStore'

const host = 'https://example.invalid/api'
const success = (accessToken: string) =>
  new Response(JSON.stringify({ state: 'success', data: { accessToken } }))
function unauthorized(config: InternalAxiosRequestConfig): never {
  throw new AxiosError('Expired', 'ERR_BAD_REQUEST', config, undefined, {
    config,
    status: 401,
    statusText: '',
    data: {},
    headers: new AxiosHeaders()
  })
}
afterEach(() => {
  clearAccessToken()
  vi.unstubAllGlobals()
})

describe('session refresh coordination', () => {
  it('shares one refresh across concurrent callers and normalizes the server path', async () => {
    let complete!: (response: Response) => void
    const fetcher = vi.fn(
      (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Promise<Response>(resolve => {
          complete = resolve
        })
    )
    vi.stubGlobal('fetch', fetcher)
    const first = refreshAccessToken(host + '/')
    const second = refreshAccessToken(host)
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    complete(success('new-token'))
    expect(await Promise.all([first, second])).toEqual([true, true])
    expect(fetcher.mock.calls[0]![0]).toBe(host + '/auth/refresh')
  })
  it('does not restore a session after sign-out while a refresh is running', async () => {
    setAccessToken('old-token')
    let complete!: (response: Response) => void
    const fetcher = vi.fn(
      (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Promise<Response>(resolve => {
          complete = resolve
        })
    )
    vi.stubGlobal('fetch', fetcher)
    const refresh = refreshAccessToken(host)
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    clearAccessToken()
    complete(success('late-token'))
    expect(await refresh).toBe(false)
    expect(getAccessToken()).toBeNull()
  })
  it('replays with an already refreshed token without rotating cookies again', async () => {
    setAccessToken('old-token')
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const client = createAxiosInstance(host, false)
    let attempts = 0
    client.defaults.adapter = async config => {
      if (++attempts === 1) {
        setAccessToken('current-token')
        unauthorized(config)
      }
      expect(config.headers.getAuthorization()).toBe('Bearer current-token')
      return { config, status: 200, statusText: '', headers: {}, data: 'ok' }
    }
    expect((await client.get('/workspace')).data).toBe('ok')
    expect(attempts).toBe(2)
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('bounds refresh and retry even when the new token is rejected', async () => {
    setAccessToken('old-token')
    const fetcher = vi.fn(async () => success('new-token'))
    vi.stubGlobal('fetch', fetcher)
    const client = createAxiosInstance(host, false)
    const send = vi.fn(async (config: InternalAxiosRequestConfig) =>
      unauthorized(config)
    )
    client.defaults.adapter = send
    await expect(client.get('/workspace')).rejects.toMatchObject({
      response: { status: 401 }
    })
    expect(send).toHaveBeenCalledTimes(2)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it.each(['/auth/login', '/api/auth/logout?all=1', host + '/auth/refresh'])(
    'does not refresh authentication endpoint %s',
    async path => {
      const fetcher = vi.fn()
      vi.stubGlobal('fetch', fetcher)
      const client = createAxiosInstance(host, false)
      client.defaults.adapter = async config => unauthorized(config)
      await expect(client.post(path)).rejects.toMatchObject({
        response: { status: 401 }
      })
      expect(fetcher).not.toHaveBeenCalled()
    }
  )
  it('never injects the Monolith session into an external request', async () => {
    setAccessToken('private-token')
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const client = createAxiosInstance(host, true)
    client.defaults.adapter = async config => {
      expect(config.headers.has('Authorization')).toBe(false)
      expect(config.headers.has('X-Monolith-Package-Names')).toBe(false)
      unauthorized(config)
    }
    await expect(client.get('https://external.invalid/')).rejects.toMatchObject(
      { response: { status: 401 } }
    )
    expect(fetcher).not.toHaveBeenCalled()
  })
})
