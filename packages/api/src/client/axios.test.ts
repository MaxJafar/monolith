import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createAxiosInstance, refreshAccessToken } from './axios'
import { clearAccessToken, getAccessToken, setAccessToken } from './tokenStore'

afterEach(() => {
  clearAccessToken()
  vi.unstubAllGlobals()
})

describe('session recovery', () => {
  it('keeps the access token through a temporary refresh outage', async () => {
    setAccessToken('synthetic-existing-token')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Network unavailable'))
    )
    expect(await refreshAccessToken('https://example.invalid')).toBe(false)
    expect(getAccessToken()).toBe('synthetic-existing-token')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ state: 'error' }), { status: 503 })
        )
    )
    expect(await refreshAccessToken('https://example.invalid')).toBe(false)
    expect(getAccessToken()).toBe('synthetic-existing-token')
  })

  it('clears invalid sessions and recovers a missing memory token from the refresh cookie', async () => {
    setAccessToken('synthetic-expired-token')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ state: 'error' }), { status: 401 })
        )
    )
    expect(await refreshAccessToken('https://example.invalid')).toBe(false)
    expect(getAccessToken()).toBeNull()
    const refresh = vi
      .fn()
      .mockImplementation(
        async () =>
          new Response(
            JSON.stringify({
              state: 'success',
              data: { accessToken: 'synthetic-refreshed-token' }
            }),
            { status: 200 }
          )
      )
    vi.stubGlobal('fetch', refresh)
    const client = createAxiosInstance('https://example.invalid', false)
    client.defaults.adapter = async config => {
      if (
        config.headers.get('Authorization') !==
        'Bearer synthetic-refreshed-token'
      )
        throw new AxiosError('Expired', 'ERR_BAD_REQUEST', config, undefined, {
          status: 401,
          statusText: 'Unauthorized',
          data: {},
          headers: new AxiosHeaders(),
          config
        })
      return {
        status: 200,
        statusText: 'OK',
        data: { saved: true },
        headers: new AxiosHeaders(),
        config
      }
    }
    expect(
      (await client.post('/workspace/save', { title: 'Synthetic' })).data
    ).toEqual({ saved: true })
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
