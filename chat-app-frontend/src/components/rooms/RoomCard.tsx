import type { Room } from '../../types'
import Avatar from '../ui/Avatar'
import { formatRelative } from '../../utils/date'

interface RoomCardProps {
  room: Room
  active?: boolean
  onClick?: () => void
  showJoin?: boolean
  onJoin?: () => void
  unreadCount?: number
}

export default function RoomCard({ room, active, onClick, showJoin, onJoin, unreadCount }: RoomCardProps) {
  return (
    <button
      className={`
        w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-l-[3px]
        ${active
          ? 'bg-green-50 border-green-500'
          : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
        }
      `}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      data-testid="room-card"
    >
      <Avatar name={room.name} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`font-medium text-sm truncate ${active ? 'text-green-700' : 'text-gray-900'}`}>
            {room.name}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {room.lastMessageAt && (
              <span className="text-xs text-gray-400">
                {formatRelative(room.lastMessageAt)}
              </span>
            )}
            {!!unreadCount && (
              <span
                className="min-w-[20px] h-5 bg-emerald-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5"
                data-testid="unread-badge"
                aria-label={`${unreadCount} unread messages`}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-gray-400">
            {room.memberCount} {room.memberCount === 1 ? 'member' : 'members'}
          </span>
          {room.description && (
            <>
              <span className="text-gray-200">·</span>
              <span className="text-xs text-gray-400 truncate">{room.description}</span>
            </>
          )}
        </div>
      </div>
      {showJoin && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onJoin?.() }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onJoin?.() } }}
          className="flex-shrink-0 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          aria-label={`Join ${room.name}`}
        >
          Join
        </span>
      )}
    </button>
  )
}
