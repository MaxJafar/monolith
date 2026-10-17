import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  type BrowserPushSubscription,
  type GymPushRegistration,
  type PushEnvironment,
  decodePushPublicKey,
  disableGymPushDelivery,
  enableGymPushDelivery,
  pushCapability,
  pushEndpointHash,
  readGymSubscription,
  registerGymWorker,
  subscribeGymPush,
  subscriptionInput,
  unsubscribeGymPush
} from './notifications'

const publicBytes = Uint8Array.from({ length: 65 }, (_, index) =>
  index === 0 ? 4 : index
)
const publicKey = Buffer.from(publicBytes).toString('base64url')
const ownerId = '1e6f1c15-3c3a-4882-bdbc-8f1cbbd6930a'

function fixture() {
  let permission: NotificationPermission = 'default'

  const order: string[] = []
  const subscription: BrowserPushSubscription = {
    endpoint: 'https://push.example.test/fixture-only',
    options: { applicationServerKey: decodePushPublicKey(publicKey) },
    toJSON: () => ({
      endpoint: subscription.endpoint,
      expirationTime: null,
      keys: { p256dh: 'a'.repeat(87), auth: 'b'.repeat(22) }
    }),
    unsubscribe: vi.fn(async () => {
      order.push('browser-remove')

      return true
    })
  }
  const active = {
    state: 'activated',
    scriptURL: 'https://zillion.example.test/zillion-gym-sw.js',
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }
  const registration: GymPushRegistration = {
    scope: 'https://zillion.example.test/gym',
    active,
    installing: null,
    waiting: null,
    pushManager: {
      getSubscription: vi.fn(async () => null),
      subscribe: vi.fn(async () => {
        order.push('subscribe')

        return subscription
      })
    }
  }
  const serviceWorker = {
    getRegistration: vi.fn(async () => registration),
    register: vi.fn(async () => {
      order.push('register')

      return registration
    })
  }
  const environment: PushEnvironment = {
    secure: true,
    origin: 'https://zillion.example.test',
    supported: true,
    permission: () => permission,
    requestPermission: vi.fn(async () => {
      order.push('permission')
      permission = 'granted'

      return permission
    }),
    serviceWorker
  }

  return {
    environment,
    registration,
    subscription,
    active,
    serviceWorker,
    order,
    grant: () => {
      permission = 'granted'
    }
  }
}

afterEach(() => vi.useRealTimers())

describe('native Gym push setup', () => {
  it('distinguishes secure unsupported and insecure environments', () => {
    const { environment } = fixture()
    expect(pushCapability(environment)).toBe('supported')
    expect(pushCapability({ ...environment, supported: false })).toBe(
      'unsupported'
    )
    expect(pushCapability({ ...environment, secure: false })).toBe('insecure')
  })

  it('reads subscription status without registering or prompting', async () => {
    const { environment, registration, subscription, serviceWorker } = fixture()
    registration.pushManager.getSubscription = vi.fn(async () => subscription)
    expect(await readGymSubscription(environment)).toBe(subscription)
    expect(environment.requestPermission).not.toHaveBeenCalled()
    expect(serviceWorker.register).not.toHaveBeenCalled()
  })

  it('ignores a root registration rather than inspecting another app subscription', async () => {
    const { environment, registration } = fixture()
    registration.scope = 'https://zillion.example.test/'
    expect(await readGymSubscription(environment)).toBeNull()
    expect(registration.pushManager.getSubscription).not.toHaveBeenCalled()
  })

  it('registers the dedicated scope without requiring push permission for offline use', async () => {
    const { environment, registration, serviceWorker } = fixture()
    expect(await registerGymWorker({ ...environment, supported: false })).toBe(
      registration
    )
    expect(serviceWorker.register).toHaveBeenCalledWith('/zillion-gym-sw.js', {
      scope: '/gym',
      updateViaCache: 'none'
    })
    expect(environment.requestPermission).not.toHaveBeenCalled()
  })

  it('waits for its own installing worker instead of a different ready worker', async () => {
    const { environment, registration, active } = fixture()
    const listeners = new Set<() => void>()
    active.state = 'installing'
    active.addEventListener = vi.fn((_type, listener) => {
      listeners.add(listener)
    })
    active.removeEventListener = vi.fn((_type, listener) => {
      listeners.delete(listener)
    })
    registration.active = null
    registration.installing = active
    const waiting = registerGymWorker(environment)
    await Promise.resolve()
    await Promise.resolve()
    expect(listeners.size).toBe(1)
    active.state = 'activated'
    registration.active = active
    registration.installing = null
    for (const listener of listeners) listener()
    expect(await waiting).toBe(registration)
    expect(listeners.size).toBe(0)
  })

  it('bounds stalled installation and removes its listener', async () => {
    vi.useFakeTimers()

    const { environment, registration, active } = fixture()
    active.state = 'installing'
    registration.active = null
    registration.installing = active
    const outcome = expect(
      registerGymWorker(environment)
    ).rejects.toMatchObject({ code: 'workerUnavailable' })
    await vi.advanceTimersByTimeAsync(10000)
    await outcome
    expect(active.removeEventListener).toHaveBeenCalledOnce()
  })

  it('waits for a worker update before returning an already active registration', async () => {
    const { environment, registration, active } = fixture()
    const listeners = new Set<() => void>()
    const update = {
      ...active,
      state: 'installing',
      addEventListener: vi.fn((_type: 'statechange', listener: () => void) => {
        listeners.add(listener)
      }),
      removeEventListener: vi.fn(
        (_type: 'statechange', listener: () => void) => {
          listeners.delete(listener)
        }
      )
    }
    registration.installing = update
    const waiting = registerGymWorker(environment)
    await Promise.resolve()
    await Promise.resolve()
    expect(listeners.size).toBe(1)
    update.state = 'activated'
    registration.active = update
    registration.installing = null
    for (const listener of listeners) listener()
    expect(await waiting).toBe(registration)
  })

  it('enables display through the dedicated activated worker without asking permission', async () => {
    const { environment, active, serviceWorker } = fixture()
    await enableGymPushDelivery(ownerId, environment)
    expect(active.postMessage).toHaveBeenCalledWith({
      type: 'GYM_PUSH_ENABLE',
      owner_id: ownerId
    })
    expect(environment.requestPermission).not.toHaveBeenCalled()
    expect(serviceWorker.register).not.toHaveBeenCalled()
  })

  it('does not enable display through an unrelated registration', async () => {
    const { environment, active, registration } = fixture()
    registration.scope = 'https://zillion.example.test/'
    await expect(
      enableGymPushDelivery(ownerId, environment)
    ).rejects.toMatchObject({ code: 'workerUnavailable' })
    expect(active.postMessage).not.toHaveBeenCalled()
  })

  it('explicit opt-out closes the worker gate without another browser unsubscribe', async () => {
    const { environment, active } = fixture()
    await disableGymPushDelivery(environment)
    expect(active.postMessage).toHaveBeenCalledWith({
      type: 'GYM_PUSH_DISABLE'
    })
  })

  it('does not re-enable an account after synchronous sign-out during worker lookup', async () => {
    const { environment, active, serviceWorker, registration } = fixture()

    let signedIn = true
    serviceWorker.getRegistration.mockImplementationOnce(async () => {
      signedIn = false

      return registration
    })
    await enableGymPushDelivery(ownerId, environment, () => signedIn)
    expect(active.postMessage).not.toHaveBeenCalled()
  })

  it.each([
    null,
    '',
    'not-a-public-key',
    Buffer.from(new Uint8Array(65)).toString('base64url')
  ])(
    'rejects missing/malformed keys before asking permission: %s',
    async key => {
      const { environment, serviceWorker } = fixture()
      await expect(
        subscribeGymPush(key, vi.fn(), environment)
      ).rejects.toMatchObject({ code: 'keyUnavailable' })
      expect(environment.requestPermission).not.toHaveBeenCalled()
      expect(serviceWorker.register).not.toHaveBeenCalled()
    }
  )

  it.each(['denied', 'default'] as const)(
    'does not subscribe after permission %s',
    async permission => {
      const { environment, serviceWorker } = fixture()
      environment.requestPermission = vi.fn(async () => permission)
      await expect(
        subscribeGymPush(publicKey, vi.fn(), environment)
      ).rejects.toMatchObject({
        code: permission === 'denied' ? 'denied' : 'dismissed'
      })
      expect(serviceWorker.register).not.toHaveBeenCalled()
    }
  )

  it('requests permission before any asynchronous worker setup and submits exact public subscription fields', async () => {
    const { environment, subscription, registration, order } = fixture()
    const save = vi.fn(async () => {
      order.push('server-save')
    })
    const operation = subscribeGymPush(publicKey, save, environment)
    expect(order).toEqual(['permission'])
    expect(await operation).toBe(subscription)
    expect(order).toEqual([
      'permission',
      'register',
      'subscribe',
      'server-save'
    ])
    expect(registration.pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: publicBytes.buffer
    })
    expect(save).toHaveBeenCalledWith(subscription.toJSON())
  })

  it('reuses an existing subscription and permission when updating preferences', async () => {
    const { environment, subscription, registration, grant } = fixture()
    grant()
    registration.pushManager.getSubscription = vi.fn(async () => subscription)
    await subscribeGymPush(publicKey, vi.fn(), environment)
    expect(environment.requestPermission).not.toHaveBeenCalled()
    expect(registration.pushManager.subscribe).not.toHaveBeenCalled()
  })

  it('rolls back a newly created browser subscription when server registration fails', async () => {
    const { environment, subscription } = fixture()
    await expect(
      subscribeGymPush(
        publicKey,
        async () => {
          throw new Error('save failed')
        },
        environment
      )
    ).rejects.toThrow('save failed')
    expect(subscription.unsubscribe).toHaveBeenCalledOnce()
  })

  it('retains an existing subscription after a failed preference save', async () => {
    const { environment, subscription, registration } = fixture()
    registration.pushManager.getSubscription = vi.fn(async () => subscription)
    await expect(
      subscribeGymPush(
        publicKey,
        async () => {
          throw new Error('save failed')
        },
        environment
      )
    ).rejects.toThrow('save failed')
    expect(subscription.unsubscribe).not.toHaveBeenCalled()
  })

  it('refuses key rotation without silently replacing an existing subscription', async () => {
    const { environment, subscription, registration } = fixture()
    const oldBytes = Uint8Array.from(publicBytes)
    oldBytes[1] = 99
    subscription.options = { applicationServerKey: oldBytes.buffer }
    registration.pushManager.getSubscription = vi.fn(async () => subscription)
    await expect(
      subscribeGymPush(publicKey, vi.fn(), environment)
    ).rejects.toMatchObject({ code: 'keyChanged' })
    expect(subscription.unsubscribe).not.toHaveBeenCalled()
    expect(registration.pushManager.subscribe).not.toHaveBeenCalled()
  })

  it('keeps browser subscription retryable if owned server removal fails', async () => {
    const { environment, subscription, registration } = fixture()
    registration.pushManager.getSubscription = vi.fn(async () => subscription)
    await expect(
      unsubscribeGymPush(async () => {
        throw new Error('offline')
      }, environment)
    ).rejects.toThrow('offline')
    expect(subscription.unsubscribe).not.toHaveBeenCalled()
  })

  it('removes owned server registration before removing the browser endpoint', async () => {
    const { environment, subscription, registration, order } = fixture()
    registration.pushManager.getSubscription = vi.fn(async () => subscription)
    const remove = vi.fn(async () => {
      order.push('server-remove')
    })
    expect(await unsubscribeGymPush(remove, environment)).toBe(true)
    expect(remove).toHaveBeenCalledWith(subscription.endpoint)
    expect(order).toEqual(['server-remove', 'browser-remove'])
  })

  it('reports partial removal when the browser refuses unsubscribe', async () => {
    const { environment, subscription, registration } = fixture()
    registration.pushManager.getSubscription = vi.fn(async () => subscription)
    subscription.unsubscribe = vi.fn(async () => false)
    await expect(
      unsubscribeGymPush(vi.fn(), environment)
    ).rejects.toMatchObject({ code: 'unsubscribeFailed' })
  })

  it('rejects browser DTOs with missing keys, mismatched endpoint, or insecure endpoint', () => {
    const { subscription } = fixture()
    subscription.toJSON = () => ({ endpoint: subscription.endpoint })
    expect(() => subscriptionInput(subscription)).toThrow('subscriptionInvalid')
    subscription.toJSON = () => ({
      endpoint: 'https://different.example.test',
      keys: { p256dh: 'key', auth: 'auth' }
    })
    expect(() => subscriptionInput(subscription)).toThrow('subscriptionInvalid')
    subscription.endpoint = 'http://push.example.test/invalid'
    subscription.toJSON = () => ({
      endpoint: subscription.endpoint,
      keys: { p256dh: 'key', auth: 'auth' }
    })
    expect(() => subscriptionInput(subscription)).toThrow('subscriptionInvalid')
  })

  it('matches the backend SHA-256 UTF-8 endpoint fingerprint without storing raw endpoints', async () => {
    const endpoint = 'https://push.example.test/device/é'
    expect(await pushEndpointHash(endpoint)).toBe(
      createHash('sha256').update(endpoint, 'utf8').digest('hex')
    )
  })
})
