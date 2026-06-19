import { pushApi, type BrowserPushSubscription } from '../api/push'

/**
 * Background Web Push setup. Registers the service worker, subscribes the browser
 * to push (using the server VAPID key), and sends the subscription to the backend.
 * All functions are best-effort no-ops when push isn't supported or configured.
 */

function pushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window
  )
}

/** VAPID public keys are base64url; the PushManager needs an ArrayBuffer-backed view. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const output = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

function toJSON(sub: PushSubscription): BrowserPushSubscription | null {
  const json = sub.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null
  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } }
}

/** Register the service worker (idempotent). Returns the registration or null. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch {
    return null
  }
}

/**
 * Subscribe this browser to push and register it with the backend.
 * Requires notification permission already granted. Safe to call repeatedly.
 */
export async function subscribeToPush(): Promise<void> {
  if (!pushSupported()) return
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

  try {
    const publicKey = await pushApi.getPublicKey()
    if (!publicKey) return // push disabled server-side (no VAPID keys)

    const registration = (await navigator.serviceWorker.ready)
    const existing = await registration.pushManager.getSubscription()
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }))

    const payload = toJSON(subscription)
    if (payload) await pushApi.subscribe(payload)
  } catch {
    // Permission revoked, network error, key mismatch — non-fatal.
  }
}

/** Remove this browser's push subscription (on logout). */
export async function unsubscribeFromPush(): Promise<void> {
  if (!pushSupported()) return
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return
    await pushApi.unsubscribe(subscription.endpoint).catch(() => {})
    await subscription.unsubscribe().catch(() => {})
  } catch {
    // ignore
  }
}

/**
 * Bridge service-worker "notification-navigate" messages to a window CustomEvent
 * so React (ChatPage) can open the right chat — reusing the same `notification:navigate`
 * event the in-app browser notifications already dispatch.
 */
export function initPushNavigationBridge(): () => void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {}
  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'notification-navigate') {
      window.dispatchEvent(
        new CustomEvent('notification:navigate', {
          detail: { conversationId: event.data.conversationId, roomId: event.data.roomId },
        }),
      )
    }
  }
  navigator.serviceWorker.addEventListener('message', handler)
  return () => navigator.serviceWorker.removeEventListener('message', handler)
}
