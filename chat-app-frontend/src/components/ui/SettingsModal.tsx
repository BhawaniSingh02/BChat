import { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import Avatar from './Avatar'
import ProfileModal from './ProfileModal'
import ChatsPanel from './settings/ChatsPanel'
import VideoVoicePanel from './settings/VideoVoicePanel'
import NotificationsPanel from './settings/NotificationsPanel'
import ShortcutsPanel from './settings/ShortcutsPanel'
import HelpPanel from './settings/HelpPanel'

type Section = 'profile' | 'account' | 'privacy' | 'chats' | 'devices' | 'notifications' | 'shortcuts' | 'help'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
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
    id: 'chats', label: 'Chats', hint: 'Theme & appearance',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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

export default function SettingsModal({ open, onClose, onLogout }: SettingsModalProps) {
  const user = useAuthStore((s) => s.user)
  const [section, setSection] = useState<Section>('profile')
  const [confirmLogout, setConfirmLogout] = useState(false)
  // Mobile drill-down: false = show the menu list, true = show the open section.
  // Ignored on desktop (md+), where both panes are always visible.
  const [navigated, setNavigated] = useState(false)

  // Reset to the first section and clear transient state each time it opens.
  useEffect(() => {
    if (open) {
      setSection('profile')
      setConfirmLogout(false)
      setNavigated(false)
    }
  }, [open])

  // Close on Escape (or go back to the list on mobile if a section is open).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (navigated && window.innerWidth < 768) setNavigated(false)
      else onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, navigated])

  if (!open || !user) return null

  const displayName = user.displayName || (user.uniqueHandle ? `@${user.uniqueHandle}` : user.username)
  const handle = user.uniqueHandle ? `@${user.uniqueHandle}` : user.email

  const openSection = (id: Section) => { setSection(id); setNavigated(true) }
  const currentLabel = section === 'profile' ? 'Edit profile' : (NAV.find((n) => n.id === section)?.label ?? 'Settings')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      data-testid="settings-modal"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} data-testid="settings-backdrop" />

      <div className="relative flex h-full w-full overflow-hidden border-slate-200/80 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#1a242b] sm:h-[85vh] sm:max-h-[640px] sm:max-w-3xl sm:rounded-2xl sm:border">
        {/* ── Left rail (full-screen menu on mobile) ── */}
        <aside data-testid="settings-rail" className={`${navigated ? 'hidden md:flex' : 'flex'} w-full flex-col border-r border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-[#111b21] md:w-[40%] md:max-w-[300px]`}>
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 md:text-xl">Settings</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200 md:hidden"
              aria-label="Close settings"
              data-testid="settings-close-mobile"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Profile card */}
          <button
            onClick={() => openSection('profile')}
            className={`mx-3 flex items-center gap-3 rounded-xl px-3 py-3.5 text-left transition-colors md:py-3 ${
              section === 'profile' ? 'md:bg-white md:shadow-sm md:dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-800/60' : 'hover:bg-white dark:hover:bg-gray-800/60'
            }`}
            data-testid="settings-profile-card"
          >
            <Avatar name={displayName} size="md" src={user.avatarUrl ?? undefined} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-gray-900 dark:text-gray-100 md:text-sm">{displayName}</p>
              <p className="truncate text-sm text-gray-400 md:text-xs">{handle}</p>
            </div>
            <svg className="h-5 w-5 flex-shrink-0 text-gray-300 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="mx-5 my-2 border-t border-gray-100 dark:border-gray-800" />

          {/* Nav */}
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => openSection(item.id)}
                className={`flex w-full items-center gap-3.5 rounded-xl px-3 py-3.5 text-left transition-colors md:gap-3 md:py-2.5 ${
                  section === item.id ? 'md:bg-white md:shadow-sm md:dark:bg-gray-800 hover:bg-white/70 dark:hover:bg-gray-800/60' : 'hover:bg-white/70 dark:hover:bg-gray-800/60'
                }`}
                data-testid={`settings-nav-${item.id}`}
              >
                <svg className="h-6 w-6 flex-shrink-0 text-gray-500 dark:text-gray-400 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  {item.icon}
                </svg>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium text-gray-800 dark:text-gray-200 md:text-sm">{item.label}</span>
                  <span className="block truncate text-[13px] text-gray-400 md:text-xs">{item.hint}</span>
                </span>
              </button>
            ))}

            <button
              onClick={() => setConfirmLogout(true)}
              className="mt-1 flex w-full items-center gap-3.5 rounded-xl px-3 py-3.5 text-left text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 md:gap-3 md:py-2.5"
              data-testid="settings-logout"
            >
              <svg className="h-6 w-6 flex-shrink-0 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-[15px] font-medium md:text-sm">Log out</span>
            </button>
          </nav>
        </aside>

        {/* ── Right detail pane (full-screen section on mobile) ── */}
        <section data-testid="settings-detail" className={`${navigated ? 'flex' : 'hidden md:flex'} relative w-full flex-col overflow-hidden md:flex-1`}>
          {/* Mobile header: back to the list + section title */}
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-3 dark:border-gray-800 md:hidden">
            <button
              onClick={() => setNavigated(false)}
              className="rounded-full p-1.5 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="Back to settings"
              data-testid="settings-back"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-base font-semibold text-gray-900 dark:text-gray-100">{currentLabel}</span>
          </div>

          {/* Desktop close button */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 hidden rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200 md:block"
            aria-label="Close settings"
            data-testid="settings-close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
            {section === 'profile' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Edit profile</h3>
                <p className="mt-0.5 text-sm text-gray-500">Your name, username and photo.</p>
                <div className="mt-4">
                  <ProfileModal embedded open initialTab="profile" onClose={() => {}} />
                </div>
              </div>
            )}
            {section === 'account' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Account</h3>
                <p className="mt-0.5 text-sm text-gray-500">Manage your profile and password.</p>

                <button
                  onClick={() => openSection('profile')}
                  className="mt-4 flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/60"
                  data-testid="account-edit-profile"
                >
                  <span>
                    <span className="block text-sm font-medium text-gray-800 dark:text-gray-200">Edit profile</span>
                    <span className="block text-xs text-gray-400">Name, username & photo</span>
                  </span>
                  <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-5">
                  <h4 className="mb-1 text-sm font-semibold text-gray-800 dark:text-gray-200">Change password</h4>
                  <ProfileModal embedded open initialTab="password" onClose={() => {}} />
                </div>
              </div>
            )}
            {section === 'privacy' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Privacy</h3>
                <p className="mt-0.5 text-sm text-gray-500">Choose what others can see about you.</p>
                <div className="mt-4">
                  <ProfileModal embedded open initialTab="privacy" onClose={() => {}} />
                </div>
              </div>
            )}
            {section === 'chats' && <ChatsPanel />}
            {section === 'devices' && <VideoVoicePanel />}
            {section === 'notifications' && <NotificationsPanel />}
            {section === 'shortcuts' && <ShortcutsPanel />}
            {section === 'help' && <HelpPanel />}
          </div>
        </section>

        {/* Logout confirmation */}
        {confirmLogout && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30" data-testid="settings-logout-confirm">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1a242b] p-6 shadow-2xl">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Log out</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Are you sure you want to log out?</p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setConfirmLogout(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
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
