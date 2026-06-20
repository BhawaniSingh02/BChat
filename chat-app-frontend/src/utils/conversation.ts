import type { DirectConversation, Message } from '../types'

/**
 * Short, list-friendly preview for a message: the text, or a media label for
 * non-text messages. Mirrors the backend's `previewTextFor` so live (WebSocket)
 * updates and server-loaded conversations look identical.
 */
export function previewForMessage(message: Pick<Message, 'content' | 'messageType' | 'deleted'>): string {
  if (message.deleted) return 'This message was deleted'
  const content = message.content
  if (content && content.trim()) {
    return content.length > 120 ? content.slice(0, 120) : content
  }
  switch (message.messageType) {
    case 'IMAGE': return '📷 Photo'
    case 'FILE': return '📎 File'
    case 'AUDIO': return '🎤 Voice message'
    case 'VIDEO': return '🎬 Video'
    default: return ''
  }
}

/**
 * True if the conversation is currently muted for the given user.
 * A mute is active when `mutedBy[username]` exists and its timestamp is in the future.
 */
export function isConversationMuted(
  conversation: Pick<DirectConversation, 'mutedBy'> | undefined,
  username: string | null | undefined,
): boolean {
  if (!conversation || !username) return false
  const until = conversation.mutedBy?.[username]
  return !!until && new Date(until).getTime() > Date.now()
}

/**
 * True if the conversation has been archived by the given user.
 */
export function isConversationArchived(
  conversation: Pick<DirectConversation, 'archivedBy'> | undefined,
  username: string | null | undefined,
): boolean {
  if (!conversation || !username) return false
  return conversation.archivedBy?.includes(username) ?? false
}
