import type { DirectConversation } from '../../types'
import Avatar from '../ui/Avatar'
import { formatRelative } from '../../utils/date'
import { useUserCacheStore } from '../../store/userCacheStore'

interface DMConversationCardProps {
  conversation: DirectConversation
  currentUsername: string
  active?: boolean
  online?: boolean
  unreadCount?: number
  onClick?: () => void
}

export default function DMConversationCard({
  conversation,
  currentUsername,
  active,
  online,
  unreadCount,
  onClick,
}: DMConversationCardProps) {
  const otherUser = conversation.participants.find((p) => p !== currentUsername) ?? '?'
  const avatarUrl = useUserCacheStore((s) => s.cache[otherUser]?.avatarUrl)

  return (
    <button
      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
        active ? 'bg-gray-100' : ''
      }`}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      data-testid="dm-card"
    >
      <Avatar name={otherUser} size="md" online={online} src={avatarUrl} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900 text-sm truncate">{otherUser}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {conversation.lastMessageAt && (
              <span className="text-xs text-gray-400 ml-2">
                {formatRelative(conversation.lastMessageAt)}
              </span>
            )}
            {!!unreadCount && (
              <span
                className="flex-shrink-0 min-w-[20px] h-5 bg-emerald-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 ml-1"
                data-testid="dm-unread-badge"
                aria-label={`${unreadCount} unread messages`}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{online ? 'Online' : 'Offline'}</p>
      </div>
    </button>
  )
}
