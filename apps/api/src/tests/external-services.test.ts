import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import searchLocations from '../core/functions/external/location'
import {
  serviceJSON,
  serviceResponse
} from '../core/functions/external/serviceRequest'
import { createFontCatalog } from '../lib/fonts/catalog'

const font = {
  family: 'Inter',
  category: 'sans-serif',
  variants: ['regular'],
  subsets: ['latin'],
  files: { regular: 'https://example.test/inter.ttf' },
  version: 'v1',
  lastModified: '2026-01-01',
  kind: 'webfonts#webfont',
  menu: 'https://example.test/inter'
}
afterEach(() => vi.unstubAllGlobals())

describe('bounded service responses', () => {
  it('supports bounded text responses and masks network exceptions', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response('workspace', {
            headers: { 'Content-Type': 'text/plain' }
          })
        )
        .mockRejectedValueOnce(new Error('https://example.test?key=secret'))
    )
    expect(await serviceResponse('Content', 'https://example.test')).toEqual({
      text: 'workspace',
      contentType: 'text/plain'
    })
    await expect(
      serviceResponse('Content', 'https://example.test')
    ).rejects.toThrow('Content returned an invalid response')
  })

  it('validates remote payloads and rejects oversized responses', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ value: 7 }))
      .mockResolvedValueOnce(Response.json({ value: 'unexpected' }))
      .mockResolvedValueOnce(Response.json({ value: 'too large' }))
    vi.stubGlobal('fetch', fetch)
    const schema = z.object({ value: z.number() })
    expect(
      await serviceJSON('Catalog', 'https://example.test', schema)
    ).toEqual({ value: 7 })
    await expect(
      serviceJSON('Catalog', 'https://example.test', schema)
    ).rejects.toThrow('invalid response')
    await expect(
      serviceJSON('Catalog', 'https://example.test', z.unknown(), {}, 4)
    ).rejects.toThrow('invalid response')
  })

  it('does not expose credentials or provider response text on HTTP errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response('secret response', { status: 403 }))
    )
    const error = await serviceJSON(
      'Catalog',
      'https://example.test?key=secret',
      z.unknown()
    ).catch(error => error)

    if (!(error instanceof Error)) throw new Error('Expected a service error')
    expect(error.message).toBe('Catalog returned HTTP 403')
    expect(error.message).not.toContain('secret')
  })
})

describe('font catalog credential boundaries', () => {
  it('deduplicates concurrent calls, returns independent values and checks missing keys before cache', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(async () => Response.json({ items: [font] }))
    vi.stubGlobal('fetch', fetch)
    const catalog = createFontCatalog()
    const [first, second] = await Promise.all([catalog('one'), catalog('one')])
    expect(fetch).toHaveBeenCalledTimes(1)
    first.items[0]!.family = 'Changed'
    expect(second.items[0]?.family).toBe('Inter')
    expect(await catalog(null)).toEqual({ enabled: false, items: [] })
    await catalog('two')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('encodes family filters and retries failed lookups without caching them', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ error: 'failure' }, { status: 503 })
      )
      .mockResolvedValueOnce(Response.json({ items: [font] }))
    vi.stubGlobal('fetch', fetch)
    const catalog = createFontCatalog()
    await expect(catalog('one', 'A&B')).rejects.toThrow('503')
    expect((await catalog('one', 'A&B')).items).toHaveLength(1)
    const url = new URL(fetch.mock.calls[1]![0])
    expect(url.searchParams.get('family')).toBe('A&B')
    expect(url.searchParams.get('key')).toBe('one')
  })
})

describe('place search decoding', () => {
  it('preserves empty results and validates coordinates', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({}))
      .mockResolvedValueOnce(
        Response.json({
          places: [
            {
              displayName: { text: 'Baku' },
              formattedAddress: 'Baku',
              location: { latitude: 40.4, longitude: 49.9 }
            }
          ]
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          places: [
            {
              displayName: { text: 'Bad' },
              formattedAddress: '',
              location: { latitude: 400, longitude: 49.9 }
            }
          ]
        })
      )
    vi.stubGlobal('fetch', fetch)
    expect(await searchLocations('key', '  ')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
    expect(await searchLocations('key', 'Baku')).toEqual([])
    expect((await searchLocations('key', 'Baku'))[0]?.name).toBe('Baku')
    await expect(searchLocations('key', 'bad')).rejects.toThrow(
      'invalid response'
    )
  })
})
