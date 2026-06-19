import { useToastStore } from '../store/toastStore'
import { playMessageChime } from '../hooks/useCallAudio'
import { showBrowserNotification } from './browserNotify'

export interface IncomingNotification {
  /** Bold heading — sender name (DM) or "#room" (room). */
  title: string
  /** Preview line. */
  body: string
  /** Name used for the toast avatar. */
  avatarName: string
  avatarUrl?: string
  conversationId?: string
  roomId?: string
}

/**
 * Present an incoming-message notification using the right channel:
 *   - App in the foreground → branded in-app toast + signature chime.
 *   - App backgrounded, desktop (Electron) → native OS notification.
 *   - App backgrounded, web → browser Notification.
 *
 * Callers must already have decided the message warrants a notification
 * (not from self, not the active chat, conversation not muted).
 */
export function presentIncomingNotification(n: IncomingNotification): void {
  const inForeground = typeof document === 'undefined' || !document.hidden

  if (inForeground) {
    useToastStore.getState().showToast({
      title: n.title,
      body: n.body,
      avatarName: n.avatarName,
      avatarUrl: n.avatarUrl,
      conversationId: n.conversationId,
      roomId: n.roomId,
    })
    playMessageChime()
    return
  }

  // Backgrounded — use the platform's native channel.
  if (typeof window !== 'undefined' && window.electronAPI) {
    window.electronAPI.notify({ title: n.title, body: n.body, chatId: n.conversationId ?? n.roomId })
    return
  }

  showBrowserNotification(n.title, n.body, { conversationId: n.conversationId, roomId: n.roomId })
}

/** Build a human-readable preview for messages whose content is empty (media). */
export function messagePreview(content: string | undefined, messageType: string | undefined): string {
  if (content && content.trim()) return content
  switch (messageType) {
    case 'IMAGE': return '📷 Photo'
    case 'FILE': return '📎 File'
    case 'AUDIO': return '🎤 Voice message'
    case 'VIDEO': return '🎬 Video'
    default: return 'New message'
  }
}
