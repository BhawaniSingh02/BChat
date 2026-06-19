/**
 * Lightweight wrapper around the browser Notification API.
 *
 * Used when the tab is backgrounded (the in-app toast wouldn't be seen). When the
 * notification is clicked we focus the window and dispatch a `notification:navigate`
 * CustomEvent so React (ChatPage) can open the right conversation — mirroring the
 * existing `auth:unauthorized` event pattern.
 */

export interface NotificationTarget {
  conversationId?: string
  roomId?: string
}

function supported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

/**
 * Ask for notification permission once, only if the user hasn't decided yet.
 * Resolves to the resulting permission ('unsupported' when the API is absent).
 */
export async function ensureNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!supported()) return 'unsupported'
  if (Notification.permission === 'default') {
    try {
      return await Notification.requestPermission()
    } catch {
      return Notification.permission
    }
  }
  return Notification.permission
}

/** Show a native browser notification (no-op unless permission is granted). */
export function showBrowserNotification(
  title: string,
  body: string,
  target: NotificationTarget = {},
): void {
  if (!supported() || Notification.permission !== 'granted') return
  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      // Collapse repeated notifications from the same chat into one.
      tag: target.conversationId ?? target.roomId ?? undefined,
    })

    notification.onclick = () => {
      window.focus()
      window.dispatchEvent(new CustomEvent('notification:navigate', { detail: target }))
      notification.close()
    }
  } catch {
    // Some environments throw when constructing Notifications — ignore.
  }
}
