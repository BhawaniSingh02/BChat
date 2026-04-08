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
        className="relative rounded-lg p-1.5 text-white/75 transition-colors hover:bg-white/12 hover:text-white"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        title="Notifications"
        data-testid="notification-bell-btn"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-slate-950"
            data-testid="notification-badge"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-11 z-40 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
          data-testid="notification-panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => { onMarkAllRead(); }}
                className="text-xs font-medium text-teal-700 hover:text-cyan-800"
                data-testid="mark-all-read-btn"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Items */}
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400" data-testid="no-notifications">
                No notifications yet
              </p>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  onClick={() => { onClickNotification(n); setOpen(false) }}
                  className={`relative flex w-full flex-col gap-0.5 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50 ${!n.read ? 'bg-teal-50/60' : ''}`}
                  data-testid="notification-item"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-teal-800">{n.message.senderName}</span>
                    <span className="flex-shrink-0 text-[10px] text-slate-400">{formatTime(n.at)}</span>
                  </div>
                  <p className="truncate text-xs text-slate-500">{n.conversationLabel}</p>
                  <p className="line-clamp-2 break-words text-sm text-slate-700">{n.message.content}</p>
                  {!n.read && (
                    <span className="absolute right-3 top-4 h-2 w-2 rounded-full bg-teal-500" aria-hidden />
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
