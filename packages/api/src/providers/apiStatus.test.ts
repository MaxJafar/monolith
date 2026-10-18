import { afterEach, describe, expect, it, vi } from 'vitest'

import { checkAPIStatus } from './apiStatus'

afterEach(() => vi.unstubAllGlobals())

describe('API availability checks', () => {
  it('accepts only the supported environment in a successful status response', async () => {
    for (const environment of ['production', 'development']) {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(Response.json({ data: { environment } }))
      )
      expect(await checkAPIStatus('http://localhost:3636')).toBe(environment)
    }
  })

  it('treats malformed or unsupported successful bodies as offline', async () => {
    for (const body of [
      null,
      {},
      { data: null },
      { data: {} },
      { data: { environment: 'unexpected' } }
    ]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body)))
      expect(await checkAPIStatus('http://localhost:3636')).toBe(false)
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not JSON')))
    expect(await checkAPIStatus('http://localhost:3636')).toBe(false)
  })

  it('returns offline for HTTP and transport failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { data: { environment: 'production' } },
            { status: 503 }
          )
        )
    )
    expect(await checkAPIStatus('http://localhost:3636')).toBe(false)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Unavailable')))
    expect(await checkAPIStatus('http://localhost:3636')).toBe(false)
  })
})
