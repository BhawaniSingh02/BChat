import { useEffect, useRef, useState } from 'react'
import type { Message } from '../../types'
import { formatTime } from '../../utils/date'

export interface NotificationItem {
  id: string
  message: Message
  conversationLabel: string
  read: boolean
  at: string
}

interface NotificationBellProps {
  notifications: NotificationItem[]
  onMarkAllRead: () => void
  onClickNotification: (notification: NotificationItem) => void
}

export default function NotificationBell({
  notifications,
  onMarkAllRead,
  onClickNotification,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" data-testid="notification-bell">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        data-testid="notification-bell-btn"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5"
            data-testid="notification-badge"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-40 overflow-hidden"
          data-testid="notification-panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => { onMarkAllRead(); }}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                data-testid="mark-all-read-btn"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Items */}
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8" data-testid="no-notifications">
                No notifications yet
              </p>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  onClick={() => { onClickNotification(n); setOpen(false) }}
                  className={`w-full text-left px-4 py-3 flex flex-col gap-0.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${!n.read ? 'bg-emerald-50/60' : ''}`}
                  data-testid="notification-item"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-emerald-700 truncate">{n.message.senderName}</span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTime(n.at)}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{n.conversationLabel}</p>
                  <p className="text-sm text-gray-700 line-clamp-2 break-words">{n.message.content}</p>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 absolute right-3" aria-hidden />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
