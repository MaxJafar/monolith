/* Gym-only offline navigation. API responses, tokens and other modules are never cached. */
const gymOfflineCache = 'zillion-gym-shell-v2'
const gymOfflineAssets = [
  '/zillion-gym-offline.html',
  '/zillion-gym-offline.js'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(gymOfflineCache).then(cache => cache.addAll(gymOfflineAssets))
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(names =>
        Promise.all(
          names
            .filter(
              name =>
                name.startsWith('zillion-gym-shell-') &&
                name !== gymOfflineCache
            )
            .map(name => caches.delete(name))
        )
      )
  )
})

self.addEventListener('message', event => {
  if (
    !event.source ||
    new URL(event.source.url).origin !== self.location.origin
  )
    return
  if (event.data?.type === 'GYM_OFFLINE_ENABLE')
    event.waitUntil(
      caches
        .open(gymOfflineCache)
        .then(cache =>
          cache.put('/zillion-gym-offline-enabled', new Response('1'))
        )
    )
  else if (event.data?.type === 'GYM_OFFLINE_DISABLE')
    event.waitUntil(
      caches
        .open(gymOfflineCache)
        .then(cache => cache.delete('/zillion-gym-offline-enabled'))
    )
})

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  if (event.request.method !== 'GET' || url.origin !== self.location.origin)
    return

  if (gymOfflineAssets.includes(url.pathname)) {
    event.respondWith(
      caches
        .open(gymOfflineCache)
        .then(
          async cache =>
            (await cache.match(url.pathname)) ?? fetch(event.request)
        )
    )

    return
  }
  if (event.request.mode !== 'navigate' || url.pathname !== '/gym') return
  event.respondWith(
    caches.open(gymOfflineCache).then(async cache => {
      const enabled = await cache.match('/zillion-gym-offline-enabled')
      const fallback = enabled
        ? await cache.match('/zillion-gym-offline.html')
        : null

      if (url.searchParams.get('offline') === '1' && fallback) return fallback

      try {
        return await fetch(event.request)
      } catch (error) {
        if (fallback) return fallback
        throw error
      }
    })
  )
})
