export const GYM_WORKER_PATH = '/zillion-gym-sw.js'

export const GYM_WORKER_SCOPE = '/gym'

export type PushCapability = 'supported' | 'unsupported' | 'insecure'

export type PushSetupCode =
  | 'unsupported'
  | 'insecure'
  | 'denied'
  | 'dismissed'
  | 'keyUnavailable'
  | 'keyChanged'
  | 'workerUnavailable'
  | 'subscriptionInvalid'
  | 'unsubscribeFailed'

export class PushSetupError extends Error {
  constructor(public readonly code: PushSetupCode) {
    super(code)
    this.name = 'PushSetupError'
  }
}

export type BrowserPushSubscription = {
  endpoint: string
  options?: { applicationServerKey?: ArrayBuffer | null }
  toJSON: () => PushSubscriptionJSON
  unsubscribe: () => Promise<boolean>
}

type WorkerVersion = {
  state: string
  scriptURL: string
  postMessage: (message: unknown) => void
  addEventListener: (type: 'statechange', listener: () => void) => void
  removeEventListener: (type: 'statechange', listener: () => void) => void
}

export type GymPushRegistration = {
  scope: string
  active: WorkerVersion | null
  installing: WorkerVersion | null
  waiting: WorkerVersion | null
  pushManager: {
    getSubscription: () => Promise<BrowserPushSubscription | null>
    subscribe: (options: {
      userVisibleOnly: boolean
      applicationServerKey: ArrayBuffer
    }) => Promise<BrowserPushSubscription>
  }
}

export type PushEnvironment = {
  secure: boolean
  origin: string
  supported: boolean
  permission: () => NotificationPermission
  requestPermission: () => Promise<NotificationPermission>
  serviceWorker: {
    getRegistration: (url: string) => Promise<GymPushRegistration | undefined>
    register: (
      script: string,
      options: { scope: string; updateViaCache: 'none' }
    ) => Promise<GymPushRegistration>
  } | null
}

export type GymPushSubscriptionInput = {
  endpoint: string
  expirationTime?: number | null
  keys: { p256dh: string; auth: string }
}

export function browserPushEnvironment(): PushEnvironment {
  const notifications = typeof Notification !== 'undefined'
  const workers =
    typeof navigator !== 'undefined' && 'serviceWorker' in navigator

  return {
    secure: typeof window !== 'undefined' && window.isSecureContext,
    origin: typeof window !== 'undefined' ? window.location.origin : '',
    supported: notifications && workers && typeof PushManager !== 'undefined',
    permission: () => (notifications ? Notification.permission : 'default'),
    requestPermission: () => Notification.requestPermission(),
    serviceWorker: workers ? navigator.serviceWorker : null
  }
}

export function pushCapability(
  environment = browserPushEnvironment()
): PushCapability {
  if (!environment.secure) return 'insecure'

  return environment.supported && environment.serviceWorker
    ? 'supported'
    : 'unsupported'
}

export function decodePushPublicKey(value: string | null): ArrayBuffer {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value))
    throw new PushSetupError('keyUnavailable')

  try {
    const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = new Uint8Array(new ArrayBuffer(raw.length))

    for (let index = 0; index < raw.length; index++)
      bytes[index] = raw.charCodeAt(index)
    if (bytes.length !== 65 || bytes[0] !== 4)
      throw new PushSetupError('keyUnavailable')

    return bytes.buffer
  } catch {
    throw new PushSetupError('keyUnavailable')
  }
}

function ownsWorker(registration: GymPushRegistration, origin: string) {
  const version =
    registration.active ?? registration.installing ?? registration.waiting

  return (
    registration.scope === new URL(GYM_WORKER_SCOPE, origin).href &&
    version?.scriptURL === new URL(GYM_WORKER_PATH, origin).href
  )
}

async function awaitActive(registration: GymPushRegistration) {
  if (
    !registration.installing &&
    !registration.waiting &&
    registration.active?.state === 'activated'
  )
    return registration

  const worker =
    registration.installing ?? registration.waiting ?? registration.active

  if (!worker) throw new PushSetupError('workerUnavailable')

  return new Promise<GymPushRegistration>((resolve, reject) => {
    const finish = () => {
      if (worker.state === 'activated' && registration.active === worker) {
        clearTimeout(timeout)
        worker.removeEventListener('statechange', finish)
        resolve(registration)
      } else if (worker.state === 'redundant') {
        clearTimeout(timeout)
        worker.removeEventListener('statechange', finish)
        reject(new PushSetupError('workerUnavailable'))
      }
    }
    const timeout = setTimeout(() => {
      worker.removeEventListener('statechange', finish)
      reject(new PushSetupError('workerUnavailable'))
    }, 10000)
    worker.addEventListener('statechange', finish)
    finish()
  })
}

// Registration alone never asks for notification permission; offline setup uses it too.
export async function registerGymWorker(
  environment = browserPushEnvironment()
) {
  if (!environment.secure) throw new PushSetupError('insecure')
  if (!environment.serviceWorker) throw new PushSetupError('unsupported')

  const registration = await environment.serviceWorker.register(
    GYM_WORKER_PATH,
    {
      scope: GYM_WORKER_SCOPE,
      updateViaCache: 'none'
    }
  )

  if (!ownsWorker(registration, environment.origin))
    throw new PushSetupError('workerUnavailable')

  return awaitActive(registration)
}

export async function readGymSubscription(
  environment = browserPushEnvironment()
) {
  if (!environment.secure || !environment.serviceWorker) return null

  const registration =
    await environment.serviceWorker.getRegistration(GYM_WORKER_SCOPE)

  // A root worker may be returned for /gym; never inspect or alter another worker.
  return registration && ownsWorker(registration, environment.origin)
    ? registration.pushManager.getSubscription()
    : null
}

export async function enableGymPushDelivery(
  ownerId: string,
  environment = browserPushEnvironment(),
  canEnable: () => boolean = () => true
) {
  if (!canEnable()) return
  if (!environment.secure || !environment.serviceWorker)
    throw new PushSetupError('unsupported')

  const registration =
    await environment.serviceWorker.getRegistration(GYM_WORKER_SCOPE)

  if (!canEnable()) return

  if (
    !registration ||
    !ownsWorker(registration, environment.origin) ||
    registration.active?.state !== 'activated'
  )
    throw new PushSetupError('workerUnavailable')
  registration.active.postMessage({
    type: 'GYM_PUSH_ENABLE',
    owner_id: ownerId
  })
}

export async function disableGymPushDelivery(
  environment = browserPushEnvironment()
) {
  if (!environment.secure || !environment.serviceWorker) return

  const registration =
    await environment.serviceWorker.getRegistration(GYM_WORKER_SCOPE)

  if (registration && ownsWorker(registration, environment.origin))
    registration.active?.postMessage({ type: 'GYM_PUSH_DISABLE' })
}

export function subscriptionInput(
  subscription: BrowserPushSubscription
): GymPushSubscriptionInput {
  const json = subscription.toJSON()
  const endpoint = json.endpoint
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth

  if (
    !endpoint ||
    endpoint !== subscription.endpoint ||
    !p256dh ||
    !auth ||
    (json.expirationTime != null && !Number.isFinite(json.expirationTime))
  )
    throw new PushSetupError('subscriptionInvalid')

  try {
    const parsed = new URL(endpoint)

    if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
      throw new PushSetupError('subscriptionInvalid')
  } catch {
    throw new PushSetupError('subscriptionInvalid')
  }

  return {
    endpoint,
    expirationTime: json.expirationTime,
    keys: { p256dh, auth }
  }
}

export async function pushEndpointHash(endpoint: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(endpoint)
  )

  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, '0')
  ).join('')
}

export async function subscribeGymPush(
  publicKey: string | null,
  save: (subscription: GymPushSubscriptionInput) => Promise<unknown>,
  environment = browserPushEnvironment()
) {
  const capability = pushCapability(environment)

  if (capability !== 'supported') throw new PushSetupError(capability)

  const applicationServerKey = decodePushPublicKey(publicKey)

  // The caller must invoke this directly from the explicit Enable button.
  const permission =
    environment.permission() === 'granted'
      ? 'granted'
      : await environment.requestPermission()

  if (permission !== 'granted')
    throw new PushSetupError(permission === 'denied' ? 'denied' : 'dismissed')

  const registration = await registerGymWorker(environment)
  const existing = await registration.pushManager.getSubscription()
  const currentKey = existing?.options?.applicationServerKey

  if (
    currentKey &&
    Array.from(new Uint8Array(currentKey)).join(',') !==
      Array.from(new Uint8Array(applicationServerKey)).join(',')
  )
    throw new PushSetupError('keyChanged')

  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    }))

  try {
    await save(subscriptionInput(subscription))
  } catch (error) {
    // Roll back only a subscription created by this attempt; retain existing ones for retry.
    if (!existing) await subscription.unsubscribe().catch(() => false)
    throw error
  }

  return subscription
}

export async function unsubscribeGymPush(
  remove: (endpoint: string) => Promise<unknown>,
  environment = browserPushEnvironment()
) {
  const subscription = await readGymSubscription(environment)

  if (!subscription) return false

  // A failed server removal must remain retryable from the same browser endpoint.
  await remove(subscription.endpoint)
  if (!(await subscription.unsubscribe()))
    throw new PushSetupError('unsubscribeFailed')

  return true
}
