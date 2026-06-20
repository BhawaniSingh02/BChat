import { useState } from 'react'
import { subscribeToPush, unsubscribeFromPush } from '../../../utils/push'

type Perm = 'default' | 'granted' | 'denied' | 'unsupported'

function currentPermission(): Perm {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission as Perm
}

export default function NotificationsPanel() {
  const [perm, setPerm] = useState<Perm>(currentPermission())
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const enable = async () => {
    setBusy(true)
    setNote(null)
    try {
      const result = await Notification.requestPermission()
      setPerm(result as Perm)
      if (result === 'granted') {
        await subscribeToPush()
        setNote('Notifications enabled on this device.')
      } else if (result === 'denied') {
        setNote('Notifications are blocked. Enable them in your browser site settings.')
      }
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    setNote(null)
    try {
      await unsubscribeFromPush()
      setNote('Notifications turned off on this device.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Notifications</h3>
      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Get notified about new messages, even when Baaat is in the background.</p>

      <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-800/40">
        {perm === 'unsupported' ? (
          <p className="text-sm text-gray-500">This browser doesn’t support notifications.</p>
        ) : perm === 'granted' ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Desktop notifications are on</p>
              <p className="text-xs text-gray-400">You’ll receive message alerts on this device.</p>
            </div>
            <button
              onClick={disable}
              disabled={busy}
              className="flex-shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white disabled:opacity-50"
              data-testid="notifications-disable"
            >
              {busy ? '…' : 'Turn off'}
            </button>
          </div>
        ) : perm === 'denied' ? (
          <div>
            <p className="text-sm font-medium text-gray-800">Notifications are blocked</p>
            <p className="mt-1 text-xs text-gray-400">Allow notifications for Baaat in your browser’s site settings, then reload.</p>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Enable desktop notifications</p>
              <p className="text-xs text-gray-400">We’ll ask your browser for permission.</p>
            </div>
            <button
              onClick={enable}
              disabled={busy}
              className="flex-shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              data-testid="notifications-enable"
            >
              {busy ? '…' : 'Enable'}
            </button>
          </div>
        )}
      </div>

      {note && <p className="mt-3 text-xs text-teal-700" data-testid="notifications-note">{note}</p>}

      <p className="mt-4 text-xs text-gray-400">
        Tip: you can mute individual chats from each conversation’s settings without turning off all notifications.
      </p>
    </div>
  )
}
