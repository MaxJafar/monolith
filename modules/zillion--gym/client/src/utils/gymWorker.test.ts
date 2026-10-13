import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync(
  new URL('../../../../../apps/web/public/zillion-gym-sw.js', import.meta.url),
  'utf8'
)
const OWNER = '1e6f1c15-3c3a-4882-bdbc-8f1cbbd6930a'
const OTHER_OWNER = 'e867e746-a1af-434d-83a4-4b6e18af20ed'

function payload(value: Record<string, unknown> = {}) {
  return { json: () => ({ owner_id: OWNER, ...value }) }
}

type NoticeOptions = { body: string; tag: string; data: { url: string } }
type WorkerEvent = {
  origin?: string
  data?: { json?: () => unknown; type?: string; owner_id?: string }
  notification?: { close: () => void; data: { url: unknown } }
  waitUntil: (operation: Promise<unknown>) => void
}
type Client = {
  url: string
  navigate: (url: string) => Promise<Client | null>
  focus: () => Promise<Client>
}

function memoryCaches() {
  const stores = new Map<string, Map<string, Response>>()

  return {
    open: vi.fn(async (name: string) => {
      const store = stores.get(name) ?? new Map<string, Response>()
      stores.set(name, store)

      return {
        put: async (url: string, response: Response) => {
          store.set(url, response.clone())
        }
      }
    }),
    match: vi.fn(async (url: string, options: { cacheName: string }) =>
      stores.get(options.cacheName)?.get(url)?.clone()
    ),
    delete: vi.fn(async (name: string) => stores.delete(name))
  }
}

function fixture(windows: Client[] = [], caches = memoryCaches()) {
  const listeners = new Map<string, (event: WorkerEvent) => void>()
  const importScripts = vi.fn()
  const showNotification = vi.fn(
    async (_title: string, _options: NoticeOptions) => {}
  )
  const close = vi.fn()
  const unsubscribe = vi.fn(async () => true)
  const getSubscription = vi.fn(async () => ({ unsubscribe }))
  const getNotifications = vi.fn(async () => [
    { close, data: { owner_id: OWNER } }
  ])
  const clients = {
    matchAll: vi.fn(async () => windows),
    openWindow: vi.fn(async (_url: string) => null)
  }
  runInNewContext(source, {
    self: {
      location: { origin: 'https://zillion.example.test' },
      registration: {
        showNotification,
        pushManager: { getSubscription },
        getNotifications
      },
      clients,
      skipWaiting: vi.fn(async () => {}),
      addEventListener: (name: string, handler: (event: WorkerEvent) => void) =>
        listeners.set(name, handler)
    },
    importScripts,
    caches,
    Response,
    URL,
    URLSearchParams
  })

  async function dispatch(
    name: string,
    options: Omit<WorkerEvent, 'waitUntil'> = {}
  ) {
    const handler = listeners.get(name)

    if (!handler) throw new Error(`Missing ${name} listener`)

    const pending: Promise<unknown>[] = []
    handler({
      ...options,
      waitUntil: promise => {
        pending.push(promise)
      }
    })
    await Promise.all(pending)
  }

  const enable = (owner = OWNER) =>
    dispatch('message', {
      origin: 'https://zillion.example.test',
      data: { type: 'GYM_PUSH_ENABLE', owner_id: owner }
    })

  return {
    listeners,
    clients,
    importScripts,
    showNotification,
    dispatch,
    enable,
    caches,
    close,
    unsubscribe,
    getNotifications
  }
}

describe('dedicated native Gym push worker', () => {
  it('delegates only offline cache handling to the root-owned script', () => {
    const { importScripts, listeners } = fixture()
    expect(importScripts).toHaveBeenCalledWith('/zillion-gym-cache.js')
    expect(listeners.has('fetch')).toBe(false)
    expect(listeners.has('push')).toBe(true)
    expect(listeners.has('notificationclick')).toBe(true)
  })

  it('displays a planned notification with a safe native workout link', async () => {
    const { dispatch, showNotification, enable } = fixture()
    await enable()
    await dispatch('push', {
      data: payload({
        title: 'Training today',
        body: 'Open your workout',
        tag: 'planned-fixture',
        url: '/gym?section=workout'
      })
    })
    expect(showNotification).toHaveBeenCalledWith(
      'Training today',
      expect.objectContaining({
        body: 'Open your workout',
        tag: 'planned-fixture',
        data: { url: '/gym?section=workout', owner_id: OWNER },
        icon: '/icon.svg'
      })
    )
  })

  it('handles missing or malformed push data without throwing', async () => {
    const { dispatch, showNotification, enable } = fixture()
    await enable()
    await dispatch('push')
    await dispatch('push', {
      data: {
        json: () => {
          throw new Error('invalid JSON')
        }
      }
    })
    await dispatch('push', { data: { json: () => ['unexpected', 'array'] } })
    expect(showNotification).not.toHaveBeenCalled()
  })

  it.each([
    'https://attacker.example.test/gym?section=coach',
    '//attacker.example.test/gym',
    '/account',
    '/gym?section=workout&redirect=https://attacker.example.test',
    '/gym?section=workout&section=coach',
    '/gym#javascript:alert(1)',
    '/gym?workout=not-a-uuid',
    '/gym?date=2026-02-30'
  ])('never forwards an unsafe notification click URL: %s', async url => {
    const { dispatch, showNotification, enable } = fixture()
    await enable()
    await dispatch('push', { data: payload({ url }) })
    expect(showNotification.mock.calls[0]?.[1].data.url).toBe('/gym')
  })

  it('preserves valid resource identifiers and civil leap dates', async () => {
    const { dispatch, showNotification, enable } = fixture()
    await enable()
    const url =
      '/gym?section=history&workout=8f18e030-2c39-4c92-8c7b-fd5fe9a410d8&date=2028-02-29&summary=1'
    await dispatch('push', { data: payload({ url }) })
    expect(showNotification.mock.calls[0]?.[1].data.url).toBe(url)
  })

  it('bounds untrusted title, body and tag fields', async () => {
    const { dispatch, showNotification, enable } = fixture()
    await enable()
    await dispatch('push', {
      data: payload({
        title: 't'.repeat(1000),
        body: 'b'.repeat(5000),
        tag: 'g'.repeat(1000)
      })
    })
    expect(showNotification.mock.calls[0]?.[0]).toHaveLength(160)
    expect(showNotification.mock.calls[0]?.[1].body).toHaveLength(1000)
    expect(showNotification.mock.calls[0]?.[1].tag).toHaveLength(160)
  })

  it('opens the native Gym link when no app window exists', async () => {
    const { dispatch, clients } = fixture()
    const close = vi.fn()
    await dispatch('notificationclick', {
      notification: { close, data: { url: '/gym?section=coach' } }
    })
    expect(close).toHaveBeenCalledOnce()
    expect(clients.matchAll).toHaveBeenCalledWith({
      type: 'window',
      includeUncontrolled: true
    })
    expect(clients.openWindow).toHaveBeenCalledWith(
      'https://zillion.example.test/gym?section=coach'
    )
  })

  it('navigates and focuses an existing Gym window rather than dropping its target', async () => {
    const client: Client = {
      url: 'https://zillion.example.test/gym?section=plan',
      navigate: vi.fn(async () => client),
      focus: vi.fn(async () => client)
    }
    const { dispatch, clients } = fixture([client])
    await dispatch('notificationclick', {
      notification: { close: vi.fn(), data: { url: '/gym?section=workout' } }
    })
    expect(client.navigate).toHaveBeenCalledWith(
      'https://zillion.example.test/gym?section=workout'
    )
    expect(client.focus).toHaveBeenCalledOnce()
    expect(clients.openWindow).not.toHaveBeenCalled()
  })

  it('revalidates click data and falls back if a previously matched window closes', async () => {
    const client: Client = {
      url: 'https://zillion.example.test/gym',
      navigate: vi.fn(async () => {
        throw new Error('closed')
      }),
      focus: vi.fn(async () => client)
    }
    const { dispatch, clients } = fixture([client])
    await dispatch('notificationclick', {
      notification: { close: vi.fn(), data: { url: 'javascript:alert(1)' } }
    })
    expect(client.navigate).toHaveBeenCalledWith(
      'https://zillion.example.test/gym'
    )
    expect(clients.openWindow).toHaveBeenCalledWith(
      'https://zillion.example.test/gym'
    )
  })

  it('does not report a rejected browser display as successful delivery', async () => {
    const { dispatch, showNotification, enable } = fixture()
    await enable()
    showNotification.mockRejectedValueOnce(new Error('permission revoked'))
    await expect(dispatch('push', { data: payload() })).rejects.toThrow(
      'permission revoked'
    )
  })

  it('ignores every push until authenticated subscription setup enables delivery', async () => {
    const { dispatch, showNotification } = fixture()
    await dispatch('push', { data: payload({ title: 'Private workout' }) })
    expect(showNotification).not.toHaveBeenCalled()
  })

  it('rejects gate commands from a foreign origin without inspecting subscriptions', async () => {
    const { dispatch, showNotification, caches, unsubscribe } = fixture()
    await dispatch('message', {
      origin: 'https://attacker.example.test',
      data: { type: 'GYM_PUSH_ENABLE', owner_id: OWNER }
    })
    await dispatch('message', {
      origin: 'https://attacker.example.test',
      data: { type: 'GYM_SIGN_OUT' }
    })
    await dispatch('push', { data: payload() })
    expect(showNotification).not.toHaveBeenCalled()
    expect(caches.open).not.toHaveBeenCalled()
    expect(unsubscribe).not.toHaveBeenCalled()
  })

  it('keeps only a nonprivate enable marker across worker restarts', async () => {
    const first = fixture()
    await first.enable()
    const marker = await first.caches.match(
      'https://zillion.example.test/__zillion_gym_push_enabled',
      { cacheName: 'zillion-gym-push-gate-v1' }
    )
    expect(await marker?.text()).toBe(OWNER)
    const restarted = fixture([], first.caches)
    await restarted.dispatch('push', { data: payload() })
    expect(restarted.showNotification).toHaveBeenCalledOnce()
  })

  it('sign-out removes the marker, unsubscribes and closes notifications, including after restart', async () => {
    const first = fixture()
    await first.enable()
    await first.dispatch('message', {
      origin: 'https://zillion.example.test',
      data: { type: 'GYM_SIGN_OUT' }
    })
    expect(first.caches.delete).toHaveBeenCalledWith('zillion-gym-push-gate-v1')
    expect(first.unsubscribe).toHaveBeenCalledOnce()
    expect(first.close).toHaveBeenCalledOnce()
    await first.dispatch('push', { data: payload() })
    const restarted = fixture([], first.caches)
    await restarted.dispatch('push', { data: payload() })
    expect(first.showNotification).not.toHaveBeenCalled()
    expect(restarted.showNotification).not.toHaveBeenCalled()
  })

  it('explicit disable clears notification display without duplicating endpoint removal', async () => {
    const { dispatch, enable, showNotification, unsubscribe, close } = fixture()
    await enable()
    await dispatch('message', {
      origin: 'https://zillion.example.test',
      data: { type: 'GYM_PUSH_DISABLE' }
    })
    await dispatch('push', { data: payload() })
    expect(showNotification).not.toHaveBeenCalled()
    expect(unsubscribe).not.toHaveBeenCalled()
    expect(close).toHaveBeenCalledOnce()
  })

  it('fails closed if the browser cannot persist the enable marker', async () => {
    const { caches, enable, dispatch, showNotification } = fixture()
    caches.open.mockRejectedValueOnce(new Error('storage unavailable'))
    await expect(enable()).rejects.toThrow('storage unavailable')
    await dispatch('push', { data: payload() })
    expect(showNotification).not.toHaveBeenCalled()
  })

  it('keeps sign-out blocked even when browser unsubscribe fails', async () => {
    const { enable, dispatch, unsubscribe, showNotification } = fixture()
    await enable()
    unsubscribe.mockRejectedValueOnce(new Error('transport unavailable'))
    await dispatch('message', {
      origin: 'https://zillion.example.test',
      data: { type: 'GYM_SIGN_OUT' }
    })
    await dispatch('push', { data: payload() })
    expect(showNotification).not.toHaveBeenCalled()
  })

  it('rejects delayed notifications for a different account after new account opt-in', async () => {
    const { enable, dispatch, showNotification } = fixture()
    await enable(OTHER_OWNER)
    await dispatch('push', { data: payload({ title: 'Old account workout' }) })
    await dispatch('push', {
      data: payload({ owner_id: OTHER_OWNER, title: 'Current account workout' })
    })
    expect(showNotification).toHaveBeenCalledOnce()
    expect(showNotification.mock.calls[0]?.[0]).toBe('Current account workout')
  })

  it('ignores missing owner IDs even with an enabled authenticated account', async () => {
    const { enable, dispatch, showNotification } = fixture()
    await enable()
    await dispatch('push', { data: { json: () => ({ title: 'No owner' }) } })
    expect(showNotification).not.toHaveBeenCalled()
  })

  it('refuses enable messages with missing or malformed account IDs', async () => {
    const { dispatch, caches, showNotification } = fixture()
    await dispatch('message', {
      origin: 'https://zillion.example.test',
      data: { type: 'GYM_PUSH_ENABLE' }
    })
    await dispatch('message', {
      origin: 'https://zillion.example.test',
      data: { type: 'GYM_PUSH_ENABLE', owner_id: 'bad-owner' }
    })
    await dispatch('push', { data: payload() })
    expect(caches.open).not.toHaveBeenCalled()
    expect(showNotification).not.toHaveBeenCalled()
  })

  it('removes a display finishing after account replacement without closing new account notifications', async () => {
    const { enable, dispatch, showNotification, close, getNotifications } =
      fixture()
    const closeNewOwner = vi.fn()
    getNotifications.mockResolvedValue([
      { close, data: { owner_id: OWNER } },
      { close: closeNewOwner, data: { owner_id: OTHER_OWNER } }
    ])
    await enable()

    let finishDisplay: () => void = () => {}

    const display = new Promise<void>(resolve => {
      finishDisplay = resolve
    })
    showNotification.mockImplementationOnce(async () => display)
    const pending = dispatch('push', { data: payload() })
    await vi.waitFor(() => expect(showNotification).toHaveBeenCalledOnce())
    await enable(OTHER_OWNER)
    finishDisplay()
    await pending
    expect(close).toHaveBeenCalledOnce()
    expect(closeNewOwner).not.toHaveBeenCalled()
  })
})
