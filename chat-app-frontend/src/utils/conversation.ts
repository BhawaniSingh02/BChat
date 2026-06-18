import type { DirectConversation } from '../types'

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
