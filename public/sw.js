// Service Worker for Radaa Transport App
// Handles: push notifications, offline caching, app shell

const CACHE_NAME = 'radaa-v2'
const OFFLINE_URL = '/offline.html'

// Assets to cache on install (app shell)
const PRECACHE_ASSETS = [
    OFFLINE_URL,
    '/icons/icon.svg',
    '/manifest.json',
]

// Install event - precache critical assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...')
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Precaching app shell')
            return cache.addAll(PRECACHE_ASSETS)
        })
    )
    self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...')
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name)
                        return caches.delete(name)
                    })
            )
        })
    )
    event.waitUntil(clients.claim())
})

// Fetch event - network-first with cache fallback
self.addEventListener('fetch', (event) => {
    const { request } = event

    // Skip non-GET requests and chrome-extension requests
    if (request.method !== 'GET') return
    if (request.url.startsWith('chrome-extension://')) return

    // Skip API requests and real-time connections
    if (request.url.includes('/api/') || request.url.includes('pusher')) return

    // For navigation requests, try network first, fall back to offline page
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .catch(() => caches.match(OFFLINE_URL))
        )
        return
    }

    // For static assets (JS, CSS, images), use stale-while-revalidate
    if (
        request.destination === 'script' ||
        request.destination === 'style' ||
        request.destination === 'image' ||
        request.destination === 'font'
    ) {
        event.respondWith(
            caches.match(request).then((cached) => {
                const fetchPromise = fetch(request).then((response) => {
                    if (response && response.status === 200) {
                        const responseClone = response.clone()
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone)
                        })
                    }
                    return response
                }).catch(() => cached)

                return cached || fetchPromise
            })
        )
        return
    }
})

// Push notification event
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received')

    let data = {
        title: 'Radaa',
        body: 'You have a new notification',
        icon: '/icons/icon.svg',
        badge: '/icons/icon.svg',
        tag: 'radaa-notification',
        data: {}
    }

    try {
        if (event.data) {
            const payload = event.data.json()
            data = {
                ...data,
                title: payload.title || data.title,
                body: payload.body || data.body,
                icon: payload.icon || data.icon,
                tag: payload.tag || data.tag,
                data: payload.data || {}
            }
        }
    } catch (e) {
        console.error('[SW] Error parsing push data:', e)
    }

    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        tag: data.tag,
        renotify: true,
        requireInteraction: false,
        vibrate: [200, 100, 200],
        data: data.data,
        actions: [
            { action: 'open', title: 'Open' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    }

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action)
    event.notification.close()

    if (event.action === 'dismiss') return

    const urlToOpen = event.notification.data?.url || '/dashboard'

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if app is already open
            for (const client of windowClients) {
                if (client.url.includes('/dashboard') && 'focus' in client) {
                    client.navigate(urlToOpen)
                    return client.focus()
                }
            }
            // Open new window
            return clients.openWindow(urlToOpen)
        })
    )
})

// Notification close event
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notification dismissed')
})

// Background sync (for future offline review submissions etc.)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-reviews') {
        console.log('[SW] Background sync: reviews')
        // Future: sync offline-submitted reviews
    }
})
