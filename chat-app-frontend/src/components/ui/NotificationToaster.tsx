import { useEffect, useState } from 'react'
import { useToastStore, type NotificationToast } from '../../store/toastStore'
import { useDMStore } from '../../store/dmStore'
import { useRoomStore } from '../../store/roomStore'
import Avatar from './Avatar'

/**
 * Light-minimal notification toast — a clean white card with a teal accent bar.
 * Slides in from the right, auto-dismisses, and opens the chat when clicked.
 */
function ToastCard({ toast }: { toast: NotificationToast }) {
  const dismissToast = useToastStore((s) => s.dismissToast)
  const setActiveDM = useDMStore((s) => s.setActiveDM)
  const setActiveRoom = useRoomStore((s) => s.setActiveRoom)

  // Mount animation: start offset/transparent, then settle in.
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const handleOpen = () => {
    if (toast.conversationId) {
      setActiveDM(toast.conversationId)
      setActiveRoom(null)
    } else if (toast.roomId) {
      setActiveRoom(toast.roomId)
      setActiveDM(null)
    }
    dismissToast(toast.id)
  }

  return (
    <div
      className={`pointer-events-auto relative flex overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-gray-700 dark:bg-[#233138] shadow-[0_12px_32px_rgba(15,23,42,0.16)] transition-all duration-300 ease-out ${
        shown ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
      }`}
      role="alert"
      data-testid="notification-toast"
    >
      {/* Teal accent bar */}
      <span className="w-1 flex-shrink-0 bg-gradient-to-b from-teal-500 to-cyan-600" aria-hidden="true" />

      <button
        onClick={handleOpen}
        className="flex flex-1 items-start gap-3 p-3 pr-8 text-left min-w-0 hover:bg-gray-50/70 transition-colors"
        data-testid="notification-toast-open"
      >
        <Avatar name={toast.avatarName} size="md" src={toast.avatarUrl} />
        <span className="flex-1 min-w-0">
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{toast.title}</span>
            <span className="text-[10px] text-gray-400 flex-shrink-0">now</span>
          </span>
          <span className="mt-0.5 block text-sm text-gray-500 truncate">{toast.body}</span>
        </span>
      </button>

      <button
        onClick={() => dismissToast(toast.id)}
        className="absolute top-1.5 right-1.5 p-1 text-gray-300 hover:text-gray-500 transition-colors"
        aria-label="Dismiss notification"
        data-testid="notification-toast-dismiss"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default function NotificationToaster() {
  const toasts = useToastStore((s) => s.toasts)
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed top-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 pointer-events-none"
      data-testid="notification-toaster"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  )
}
