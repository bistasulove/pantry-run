/**
 * Pantry Run service worker — hand-rolled, no Workbox.
 *
 * Caching contract (CLAUDE.md §19, §23):
 *   - Static build assets (/_next/static/*, fonts, icons, manifest) → cache-first
 *   - HTML navigation requests → network-first with cache fallback (offline shell)
 *   - Anything cross-origin (Supabase, Google Fonts CDN if used) → pass through
 *   - Anything non-GET → pass through (POST/PUT/DELETE never cached)
 *
 * Versioning: bump CACHE_VERSION whenever the strategy changes. The activate
 * step deletes any cache not on the allow-list, so old payloads don't linger.
 * skipWaiting + clients.claim means the new SW takes effect on the next nav
 * without requiring a full reload.
 */

const CACHE_VERSION = 'v3'
const STATIC_CACHE = `pantry-run-static-${CACHE_VERSION}`
const SHELL_CACHE = `pantry-run-shell-${CACHE_VERSION}`

// Minimal precache list — just the shell entry + icons. Build-hashed JS/CSS
// bundles populate STATIC_CACHE at runtime; precaching them by name would
// require a build-time manifest we don't generate.
const PRECACHE_URLS = [
  '/list',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE)
      // Each entry added individually so one missing asset doesn't tank install.
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(url)
          } catch (err) {
            console.warn('[sw] precache miss', url, err)
          }
        }),
      )
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      const allow = new Set([STATIC_CACHE, SHELL_CACHE])
      await Promise.all(keys.filter((k) => !allow.has(k)).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

function isStaticAsset(url) {
  // Next emits hashed bundles under /_next/static/*; everything there is
  // immutable so cache-first is safe and gives instant repeat loads.
  if (url.pathname.startsWith('/_next/static/')) return true
  if (url.pathname.startsWith('/icons/')) return true
  if (url.pathname === '/manifest.json') return true
  if (url.pathname === '/favicon.ico') return true
  return false
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone()).catch(() => {})
      return response
    })
    .catch(() => null)
  return cached || (await network) || new Response('', { status: 504 })
}

async function networkFirstShell(request) {
  const cache = await caches.open(SHELL_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone()).catch(() => {})
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    // Fall back to the precached /list shell so the app still boots offline.
    const shell = await cache.match('/list')
    if (shell) return shell
    return new Response('Offline', { status: 503, statusText: 'Offline' })
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Cross-origin: Supabase API, Google Fonts CDN, anything else — pass through.
  // Never cache Supabase responses (CLAUDE.md §19, §23: "always network-first
  // for data; never cache API responses").
  if (url.origin !== self.location.origin) return

  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE))
    return
  }

  // Internal API routes are pass-through. They're potentially state-bearing
  // (health probes, future RPCs) and shouldn't be served stale — defensive
  // default that future /api/* additions inherit automatically.
  if (url.pathname.startsWith('/api/')) return

  // HTML navigations — keep fresh, but fall back to cached shell offline.
  const acceptsHtml = request.headers.get('accept')?.includes('text/html')
  if (request.mode === 'navigate' || acceptsHtml) {
    event.respondWith(networkFirstShell(request))
    return
  }

  // Everything else same-origin: SWR for the snappy repeat-load benefit.
  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE))
})

// ──────────────────────────────────────────────────────────────────────────
// Push notifications (M16)
//
// Payload contract (sent by src/lib/push/send.ts):
//   { title, body, kind, target_id?, household_id? }
//
//   kind is one of:
//     'reminder' (M17) → opens /plan?tab=reminders&focus=<target_id>
//     'task'     (M18) → opens /plan?tab=tasks&focus=<target_id>
//     'test'     (M16 dev seam) → opens /list
//
// tag = `${kind}:${target_id}` so re-fires for the same target replace the
// previous notification instead of stacking. Without a tag, every fire would
// produce a new entry in the OS notification tray.
// ──────────────────────────────────────────────────────────────────────────

function routeForKind(kind, targetId) {
  const focus = targetId ? `&focus=${encodeURIComponent(targetId)}` : ''
  if (kind === 'reminder') return `/plan?tab=reminders${focus}`
  if (kind === 'task') return `/plan?tab=tasks${focus}`
  return '/list'
}

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Pantry Run', body: event.data.text() }
  }
  const { title = 'Pantry Run', body = '', kind, target_id: targetId } = payload
  const tag = kind && targetId ? `${kind}:${targetId}` : undefined
  const url = routeForKind(kind, targetId)
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { kind, targetId, url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/list'
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = all.find((c) => c.url.startsWith(self.location.origin))
      if (existing) {
        try {
          await existing.focus()
          await existing.navigate(url)
        } catch {
          // navigate() can reject (cross-document policy, detached client).
          // Fall back to opening a fresh window so the user lands somewhere.
          await self.clients.openWindow(url)
        }
        return
      }
      await self.clients.openWindow(url)
    })(),
  )
})

// pushsubscriptionchange fires when the browser rotates the endpoint (rare,
// but happens on key refresh or quota events). The client re-subscribes and
// POSTs the new subscription via usePushNotifications.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of all) {
        client.postMessage({ type: 'pushsubscriptionchange' })
      }
    })(),
  )
})
