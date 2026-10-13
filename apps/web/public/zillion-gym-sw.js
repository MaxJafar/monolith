/* global importScripts */
/* Native monolith Gym worker. The shared offline layer is opt-in and owns its cache. */
importScripts('/zillion-gym-cache.js')

const GYM_SECTIONS = new Set([
  'dashboard',
  'plan',
  'workout',
  'library',
  'history',
  'stats',
  'settings',
  'coach'
])
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PUSH_GATE_CACHE = 'zillion-gym-push-gate-v1'
const PUSH_GATE_URL = new URL(
  '/__zillion_gym_push_enabled',
  self.location.origin
).href

let gateMutation = Promise.resolve()
let signedOut = false

self.addEventListener('message', event => {
  if (event.origin !== self.location.origin) return

  const type = event.data?.type

  if (
    type !== 'GYM_PUSH_ENABLE' &&
    type !== 'GYM_SIGN_OUT' &&
    type !== 'GYM_PUSH_DISABLE'
  )
    return
  if (
    type === 'GYM_PUSH_ENABLE' &&
    (typeof event.data.owner_id !== 'string' || !UUID.test(event.data.owner_id))
  )
    return
  if (type !== 'GYM_PUSH_ENABLE') signedOut = true
  gateMutation = gateMutation
    .catch(() => {})
    .then(async () => {
      if (type === 'GYM_PUSH_ENABLE') {
        const cache = await caches.open(PUSH_GATE_CACHE)
        await cache.put(PUSH_GATE_URL, new Response(event.data.owner_id))
        signedOut = false

        return
      }
      signedOut = true
      await Promise.allSettled([
        caches.delete(PUSH_GATE_CACHE),
        type === 'GYM_SIGN_OUT'
          ? self.registration.pushManager
              .getSubscription()
              .then(subscription => subscription?.unsubscribe())
          : Promise.resolve(),
        self.registration.getNotifications().then(notifications => {
          for (const notification of notifications) notification.close()
        })
      ])
    })
  event.waitUntil(gateMutation)
})

async function pushOwner() {
  try {
    await gateMutation
    const marker = await caches.match(PUSH_GATE_URL, {
      cacheName: PUSH_GATE_CACHE
    })
    const owner = await marker?.text()

    return !signedOut && typeof owner === 'string' && UUID.test(owner)
      ? owner
      : null
  } catch {
    // A missing or unreadable opt-in marker fails closed.
    return null
  }
}

function gymNotificationUrl(value) {
  if (typeof value !== 'string' || value.length > 1200) return '/gym'

  try {
    const url = new URL(value, self.location.origin)

    if (
      url.origin !== self.location.origin ||
      url.username ||
      url.password ||
      url.hash ||
      (url.pathname !== '/gym' && url.pathname !== '/gym/')
    )
      return '/gym'

    const query = new URLSearchParams()

    for (const [key, entry] of url.searchParams) {
      if (query.has(key)) return '/gym'
      if (key === 'section' && GYM_SECTIONS.has(entry)) query.set(key, entry)
      else if ((key === 'routine' || key === 'workout') && UUID.test(entry))
        query.set(key, entry)
      else if (key === 'date' && validCivilDate(entry)) query.set(key, entry)
      else if (key === 'summary' && entry === '1') query.set(key, entry)
      else return '/gym'
    }

    const search = query.toString()

    return `/gym${search ? `?${search}` : ''}`
  } catch {
    return '/gym'
  }
}

function validCivilDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

  return (
    year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]
  )
}

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('push', event => {
  event.waitUntil(
    (async () => {
      let payload = {}

      try {
        const parsed = event.data?.json()

        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
          payload = parsed
      } catch {
        return
      }
      if (
        typeof payload.owner_id !== 'string' ||
        payload.owner_id !== (await pushOwner())
      )
        return

      const text = (value, fallback, limit) =>
        typeof value === 'string' && value.trim()
          ? value.slice(0, limit)
          : fallback
      await self.registration.showNotification(
        text(payload.title, 'monolith Gym', 160),
        {
          body: text(payload.body, 'Open Gym to view your notification.', 1000),
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: text(payload.tag, 'zillion-gym', 160),
          data: {
            url: gymNotificationUrl(payload.url),
            owner_id: payload.owner_id
          }
        }
      )

      if (payload.owner_id !== (await pushOwner())) {
        const notifications = await self.registration.getNotifications()

        for (const notification of notifications)
          if (notification.data?.owner_id === payload.owner_id)
            notification.close()
      }
    })()
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const path = gymNotificationUrl(event.notification.data?.url)
  const target = new URL(path, self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      })
      const owned = windows.filter(client => {
        try {
          return new URL(client.url).origin === self.location.origin
        } catch {
          return false
        }
      })
      const client =
        owned.find(item => new URL(item.url).pathname === '/gym') ?? owned[0]

      if (client && 'navigate' in client && 'focus' in client) {
        try {
          const navigated = await client.navigate(target)

          if (navigated) return navigated.focus()
        } catch {
          // A tab may close between inspection and navigation.
        }
      }

      return self.clients.openWindow(target)
    })()
  )
})
