// SPDX-License-Identifier: 0BSD
import { afterEach, expect, it, vi } from 'vitest'

import { attributionLink, fetchIconPage } from './catalog'

afterEach(() => vi.unstubAllGlobals())
it('encodes the search, respects pagination and passes cancellation to fetch', async () => {
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      icons: ['lucide:house', 'lucide:house', 'bad/value'],
      limit: 3
    })
  })
  vi.stubGlobal('fetch', fetcher)
  const signal = new AbortController().signal
  const page = await fetchIconPage(
    { prefix: 'lucide', query: 'home & office', start: 192 },
    signal
  )
  const [url, options] = fetcher.mock.calls[0]
  expect(url.origin).toBe('https://api.iconify.design')
  expect(url.searchParams.get('query')).toBe('home & office')
  expect(url.searchParams.get('start')).toBe('192')
  expect(options.signal).toBe(signal)
  expect(page).toEqual({ icons: ['lucide:house'], more: true, next: 195 })
})
it('reads both collection group formats and deduplicates their icons', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        prefix: 'lucide',
        uncategorized: ['house'],
        categories: { work: ['briefcase', 'house'], invalid: null }
      })
    })
  )
  expect(
    await fetchIconPage(
      { prefix: 'lucide', query: '' },
      new AbortController().signal
    )
  ).toEqual({
    icons: ['lucide:house', 'lucide:briefcase'],
    more: false,
    next: 0
  })
})
it('distinguishes an empty result from service or format failures', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ icons: [], limit: 192 })
    })
    .mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ unexpected: [] }) })
  vi.stubGlobal('fetch', fetcher)
  const request = { prefix: '', query: 'none' },
    signal = new AbortController().signal
  expect((await fetchIconPage(request, signal)).icons).toEqual([])
  await expect(fetchIconPage(request, signal)).rejects.toThrow('503')
  await expect(fetchIconPage(request, signal)).rejects.toThrow('Invalid')
})
it('keeps collection samples usable without a catalog request', async () => {
  const fetcher = vi.fn()
  vi.stubGlobal('fetch', fetcher)
  expect(
    (
      await fetchIconPage(
        { prefix: '', query: '' },
        new AbortController().signal
      )
    ).icons.length
  ).toBeGreaterThan(100)
  expect(fetcher).not.toHaveBeenCalled()
})
it('allows web attribution links but never script or data URLs', () => {
  expect(attributionLink('https://example.com/license')).toBe(
    'https://example.com/license'
  )
  expect(attributionLink('javascript:alert(1)')).toBeUndefined()
  expect(attributionLink('data:text/html,test')).toBeUndefined()
})
