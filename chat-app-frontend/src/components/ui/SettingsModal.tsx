import { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import Avatar from './Avatar'
import VideoVoicePanel from './settings/VideoVoicePanel'
import NotificationsPanel from './settings/NotificationsPanel'
import ShortcutsPanel from './settings/ShortcutsPanel'
import HelpPanel from './settings/HelpPanel'

type ProfileTab = 'profile' | 'password' | 'privacy'
type Section = 'account' | 'privacy' | 'devices' | 'notifications' | 'shortcuts' | 'help'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  /** Open the profile editor at a specific tab (handled by the parent). */
  onOpenProfileTab: (tab: ProfileTab) => void
  onLogout: () => void
}

interface NavItem {
  id: Section
  label: string
  hint: string
  icon: React.ReactNode
}

const NAV: NavItem[] = [
  {
    id: 'account', label: 'Account', hint: 'Profile, password, email',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM5 20a7 7 0 0114 0H5z" />
    ),
  },
  {
    id: 'privacy', label: 'Privacy', hint: 'Last seen, blocking, disappearing',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.105.895-2 2-2s2 .895 2 2m-9 0V7a5 5 0 0110 0v4m-12 0h14a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7a1 1 0 011-1z" />
    ),
  },
  {
    id: 'devices', label: 'Video & voice', hint: 'Camera, microphone & speakers',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    ),
  },
  {
    id: 'notifications', label: 'Notifications', hint: 'Message notifications',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    ),
  },
  {
    id: 'shortcuts', label: 'Keyboard shortcuts', hint: 'Quick actions',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1zm3 4h.01M11 10h.01M15 10h.01M7 14h10" />
    ),
  },
  {
    id: 'help', label: 'Help', hint: 'About, privacy policy',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
]

export default function SettingsModal({ open, onClose, onOpenProfileTab, onLogout }: SettingsModalProps) {
  const user = useAuthStore((s) => s.user)
  const [section, setSection] = useState<Section>('account')
  const [confirmLogout, setConfirmLogout] = useState(false)

  // Reset to the first section and clear transient state each time it opens.
  useEffect(() => {
    if (open) {
      setSection('account')
      setConfirmLogout(false)
    }
  }, [open])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !user) return null

  const displayName = user.displayName || (user.uniqueHandle ? `@${user.uniqueHandle}` : user.username)
  const handle = user.uniqueHandle ? `@${user.uniqueHandle}` : user.email

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      data-testid="settings-modal"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} data-testid="settings-backdrop" />

      <div className="relative flex h-[85vh] max-h-[640px] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl">
        {/* ── Left rail ── */}
        <aside className="flex w-[40%] max-w-[300px] flex-col border-r border-gray-100 bg-gray-50/60">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-xl font-bold text-gray-900">Settings</h2>
          </div>

          {/* Profile card */}
          <button
            onClick={() => onOpenProfileTab('profile')}
            className="mx-3 flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white"
            data-testid="settings-profile-card"
          >
            <Avatar name={displayName} size="md" src={user.avatarUrl ?? undefined} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
              <p className="truncate text-xs text-gray-400">{handle}</p>
            </div>
            <svg className="h-4 w-4 flex-shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="mx-5 my-2 border-t border-gray-100" />

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 pb-3">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'account') { onOpenProfileTab('password'); return }
                  if (item.id === 'privacy') { onOpenProfileTab('privacy'); return }
                  setSection(item.id)
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  section === item.id ? 'bg-white shadow-sm' : 'hover:bg-white/70'
                }`}
                data-testid={`settings-nav-${item.id}`}
              >
                <svg className="h-5 w-5 flex-shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  {item.icon}
                </svg>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-gray-800">{item.label}</span>
                  <span className="block truncate text-xs text-gray-400">{item.hint}</span>
                </span>
              </button>
            ))}

            <button
              onClick={() => setConfirmLogout(true)}
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-red-600 transition-colors hover:bg-red-50"
              data-testid="settings-logout"
            >
              <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-sm font-medium">Log out</span>
            </button>
          </nav>
        </aside>

        {/* ── Right detail pane ── */}
        <section className="relative flex-1 overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close settings"
            data-testid="settings-close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="px-7 py-6">
            {section === 'devices' && <VideoVoicePanel />}
            {section === 'notifications' && <NotificationsPanel />}
            {section === 'shortcuts' && <ShortcutsPanel />}
            {section === 'help' && <HelpPanel />}
            {(section === 'account' || section === 'privacy') && (
              // These open the dedicated editor; this is just a brief landing state.
              <div className="flex h-full flex-col items-center justify-center pt-20 text-center text-gray-400">
                <p className="text-sm">Opening {section === 'account' ? 'account' : 'privacy'} settings…</p>
              </div>
            )}
          </div>
        </section>

        {/* Logout confirmation */}
        {confirmLogout && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30" data-testid="settings-logout-confirm">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="text-base font-semibold text-gray-900">Log out</h3>
              <p className="mt-1 text-sm text-gray-600">Are you sure you want to log out?</p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setConfirmLogout(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  data-testid="settings-cancel-logout"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setConfirmLogout(false); onLogout() }}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
                  data-testid="settings-confirm-logout"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
