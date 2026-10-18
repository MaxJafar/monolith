import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync(
  new URL(
    '../../../../../apps/web/public/zillion-gym-cache.js',
    import.meta.url
  ),
  'utf8'
)

type CacheEvent = {
  request?: { url: string; method: string; mode: string }
  source?: { url: string }
  data?: { type: string }
  waitUntil: (promise: Promise<unknown>) => void
  respondWith: (promise: Promise<Response>) => void
}

function fixture(enabled = false) {
  const data = new Map<string, Response>([
    ['/zillion-gym-offline.html', new Response('cached Gym')],
    ['/zillion-gym-offline.js', new Response('cached script')]
  ])

  if (enabled) data.set('/zillion-gym-offline-enabled', new Response('1'))

  const listeners = new Map<string, (event: CacheEvent) => void>()
  const addAll = vi.fn(async (_paths: string[]) => {})
  const removeCache = vi.fn(async (_name: string) => true)
  const fetch = vi.fn(async (_request: unknown) => {
    throw new Error('offline')
  })
  runInNewContext(source, {
    self: {
      location: { origin: 'https://zillion.example.test' },
      addEventListener: (name: string, callback: (event: CacheEvent) => void) =>
        listeners.set(name, callback)
    },
    caches: {
      keys: async () => [
        'zillion-gym-shell-v1',
        'zillion-gym-shell-v2',
        'zillion-gym-push-gate-v1',
        'another-module-cache'
      ],
      delete: removeCache,
      open: async () => ({
        addAll,
        match: async (key: string) => data.get(key)?.clone(),
        put: async (key: string, value: Response) => {
          data.set(key, value)
        },
        delete: async (key: string) => data.delete(key)
      })
    },
    fetch,
    URL,
    Response
  })

  async function dispatch(name: string, event: Partial<CacheEvent>) {
    const pending: Promise<unknown>[] = []

    let response: Promise<Response> | null = null
    listeners.get(name)?.({
      ...event,
      waitUntil: promise => {
        pending.push(promise)
      },
      respondWith: promise => {
        response = promise
      }
    })
    await Promise.all(pending)

    return response as Promise<Response> | null
  }

  return { data, fetch, addAll, removeCache, dispatch }
}

describe('Gym-only cold offline fallback', () => {
  it('removes an outdated Gym shell without clearing push ownership or another module', async () => {
    const f = fixture()
    await f.dispatch('activate', {})
    expect(f.removeCache.mock.calls).toEqual([['zillion-gym-shell-v1']])
  })
  it('precaches only the independent static Gym page and script', async () => {
    const f = fixture()
    await f.dispatch('install', {})
    expect(f.addAll).toHaveBeenCalledWith([
      '/zillion-gym-offline.html',
      '/zillion-gym-offline.js'
    ])
  })
  it('serves the cached Gym page for failed navigation only after opt-in', async () => {
    const f = fixture(true)
    const response = await f.dispatch('fetch', {
      request: {
        url: 'https://zillion.example.test/gym?section=history',
        method: 'GET',
        mode: 'navigate'
      }
    })
    expect(await response?.text()).toBe('cached Gym')
  })
  it('supports reviewing the cache without disabling device connectivity', async () => {
    const f = fixture(true)
    const response = await f.dispatch('fetch', {
      request: {
        url: 'https://zillion.example.test/gym?offline=1',
        method: 'GET',
        mode: 'navigate'
      }
    })
    expect(await response?.text()).toBe('cached Gym')
    expect(f.fetch).not.toHaveBeenCalled()
  })
  it('never intercepts API, another module, cross-origin or mutating requests', async () => {
    const f = fixture(true)

    for (const [url, method, mode] of [
      ['https://zillion.example.test/api/gym/snapshot', 'GET', 'cors'],
      ['https://zillion.example.test/calendar', 'GET', 'navigate'],
      ['https://api.example.test/gym', 'GET', 'navigate'],
      ['https://zillion.example.test/gym', 'POST', 'navigate']
    ])
      expect(
        await f.dispatch('fetch', {
          request: { url: url!, method: method!, mode: mode! }
        })
      ).toBeNull()
    expect(f.fetch).not.toHaveBeenCalled()
  })
  it('denies offline fallback when it has not been enabled', async () => {
    const f = fixture()
    await expect(
      f.dispatch('fetch', {
        request: {
          url: 'https://zillion.example.test/gym',
          method: 'GET',
          mode: 'navigate'
        }
      })
    ).rejects.toThrow('offline')
  })
  it('clears the fallback marker on sign-out or cache removal', async () => {
    const f = fixture(true)
    await f.dispatch('message', {
      source: { url: 'https://zillion.example.test/dashboard' },
      data: { type: 'GYM_OFFLINE_DISABLE' }
    })
    expect(f.data.has('/zillion-gym-offline-enabled')).toBe(false)
    await f.dispatch('message', {
      source: { url: 'https://foreign.example.test/gym' },
      data: { type: 'GYM_OFFLINE_ENABLE' }
    })
    expect(f.data.has('/zillion-gym-offline-enabled')).toBe(false)
    await f.dispatch('message', {
      source: { url: 'https://zillion.example.test/gym' },
      data: { type: 'GYM_OFFLINE_ENABLE' }
    })
    expect(f.data.has('/zillion-gym-offline-enabled')).toBe(true)
  })
})
