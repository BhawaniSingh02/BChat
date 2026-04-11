import { useCallback, useEffect, useRef, useState } from 'react'
import type { DirectConversation } from '../../types'
import Avatar from '../ui/Avatar'
import { formatRelative } from '../../utils/date'
import { useUserCacheStore } from '../../store/userCacheStore'

interface ContextMenuState {
  x: number
  y: number
}

interface DMConversationCardProps {
  conversation: DirectConversation
  currentUsername: string
  active?: boolean
  online?: boolean
  unreadCount?: number
  isPinned?: boolean
  onClick?: () => void
  onPin?: (conversationId: string) => void
  onDelete?: (conversationId: string) => void
}

export default function DMConversationCard({
  conversation,
  currentUsername,
  active,
  online,
  unreadCount,
  isPinned,
  onClick,
  onPin,
  onDelete,
}: DMConversationCardProps) {
  const otherUser = conversation.participants.find((p) => p !== currentUsername) ?? '?'
  const cachedUser = useUserCacheStore((s) => s.cache[otherUser])
  const avatarUrl = cachedUser?.avatarUrl
  // Prefer displayName > username from cache > raw participant string
  const displayName = cachedUser?.displayName || cachedUser?.username || otherUser

  const [menu, setMenu] = useState<ContextMenuState | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const closeMenu = useCallback(() => setMenu(null), [])

  // Close on outside click or Escape
  useEffect(() => {
    if (!menu) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeMenu()
    }
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMenu() }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [menu, closeMenu])

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!onPin && !onDelete) return
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY })
  }

  const handlePin = () => {
    onPin?.(conversation.id)
    closeMenu()
  }

  const handleDelete = () => {
    onDelete?.(conversation.id)
    closeMenu()
  }

  return (
    <>
      <button
        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
          active ? 'bg-gray-100' : ''
        }`}
        onClick={onClick}
        onContextMenu={handleContextMenu}
        aria-current={active ? 'page' : undefined}
        data-testid="dm-card"
      >
        <Avatar name={displayName} size="md" online={online} src={avatarUrl} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900 text-sm truncate">
              {isPinned && (
                <span className="mr-1 text-teal-600" aria-label="Pinned">📌</span>
              )}
              {displayName}
            </span>
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

      {/* Context menu */}
      {menu && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[160px] rounded-xl border border-gray-100 bg-white shadow-xl py-1 text-sm"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
          data-testid="dm-context-menu"
        >
          {onPin && (
            <button
              onClick={handlePin}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 transition-colors"
              role="menuitem"
              data-testid="context-pin-btn"
            >
              <span className="text-base">{isPinned ? '📌' : '📌'}</span>
              {isPinned ? 'Unpin chat' : 'Pin chat'}
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2 transition-colors"
              role="menuitem"
              data-testid="context-delete-btn"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete chat
            </button>
          )}
        </div>
      )}
    </>
  )
}
