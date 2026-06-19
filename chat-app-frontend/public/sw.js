/* Baaat service worker — background Web Push notifications. */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }

  const title = data.title || 'Baaat'
  const body = data.body || 'New message'
  const tag = data.conversationId || data.roomId || undefined

  event.waitUntil(
    (async () => {
      // If the app is already open and focused, the in-app toast handles it —
      // don't double-notify with an OS notification.
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const focused = windows.some((c) => c.focused || c.visibilityState === 'visible')
      if (focused) return

      await self.registration.showNotification(title, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag,
        data: { conversationId: data.conversationId, roomId: data.roomId },
      })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data || {}

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = windows.find((c) => c.url.includes('/chat')) || windows[0]

      if (existing) {
        await existing.focus()
        existing.postMessage({
          type: 'notification-navigate',
          conversationId: target.conversationId,
          roomId: target.roomId,
        })
        return
      }

      // No open window — cold-open the app with the target encoded in the URL.
      const params = new URLSearchParams()
      if (target.conversationId) params.set('cid', target.conversationId)
      else if (target.roomId) params.set('rid', target.roomId)
      const qs = params.toString()
      await self.clients.openWindow(`/chat${qs ? `?${qs}` : ''}`)
    })(),
  )
})
