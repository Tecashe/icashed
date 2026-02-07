// Service Worker for Push Notifications
// Radaa Transport App - Phase 2

const CACHE_NAME = 'radaa-v1'

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...')
    self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...')
    event.waitUntil(clients.claim())
})

// Push notification event
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received')

    let data = {
        title: 'Radaa',
        body: 'You have a new notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
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
        data: data.data,
        vibrate: [100, 50, 100],
        actions: [
            { action: 'open', title: 'View' },
            { action: 'close', title: 'Dismiss' }
        ],
        requireInteraction: false
    }

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action)

    event.notification.close()

    if (event.action === 'close') {
        return
    }

    // Default action: open the app
    const urlToOpen = event.notification.data?.url || '/dashboard'

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // If a window is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes('/dashboard') && 'focus' in client) {
                        return client.focus()
                    }
                }
                // Otherwise open a new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen)
                }
            })
    )
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag)

    if (event.tag === 'sync-presence') {
        event.waitUntil(syncPresence())
    }
})

async function syncPresence() {
    // Sync passenger presence when back online
    try {
        const cache = await caches.open(CACHE_NAME)
        const pendingPresence = await cache.match('/pending-presence')

        if (pendingPresence) {
            const data = await pendingPresence.json()
            await fetch('/api/passenger/presence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            await cache.delete('/pending-presence')
        }
    } catch (e) {
        console.error('[SW] Sync presence failed:', e)
    }
}
