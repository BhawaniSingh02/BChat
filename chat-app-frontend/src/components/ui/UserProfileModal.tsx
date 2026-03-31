import { useEffect, useState } from 'react'
import type { User } from '../../types'
import { usersApi } from '../../api/users'
import { usePresenceStore } from '../../store/presenceStore'
import { useAuthStore } from '../../store/authStore'
import Avatar from './Avatar'
import EditProfileModal from './EditProfileModal'

interface UserProfileModalProps {
  username: string | null
  onClose: () => void
}

export default function UserProfileModal({ username, onClose }: UserProfileModalProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const isOnline = usePresenceStore((s) => s.isOnline)
  const currentUser = useAuthStore((s) => s.user)

  const isOwnProfile = currentUser?.username === username

  useEffect(() => {
    if (!username) return
    setLoading(true)
    setError(false)
    setUser(null)
    usersApi.get(username)
      .then(setUser)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [username])

  // Refresh user data after editing
  useEffect(() => {
    if (!editOpen && isOwnProfile && currentUser) {
      setUser(currentUser)
    }
  }, [editOpen, isOwnProfile, currentUser])

  if (!username) return null

  const online = isOnline(username)

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-label="User profile"
        data-testid="user-profile-modal"
      >
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
          data-testid="user-profile-backdrop"
        />

        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
          {/* Header gradient */}
          <div className="h-20 bg-gradient-to-br from-blue-500 to-indigo-600" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/80 hover:text-white bg-white/20 hover:bg-white/30 rounded-lg p-1.5 transition-colors"
            aria-label="Close"
            data-testid="close-user-profile-btn"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="px-6 pb-6">
            <div className="-mt-8 mb-3 flex items-end justify-between">
              <div className="flex items-end gap-3">
                <div className="ring-4 ring-white rounded-full shadow-md">
                  <Avatar
                    name={username}
                    size="xl"
                    online={online}
                    src={user?.avatarUrl ?? undefined}
                  />
                </div>
                <div className="mb-1">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                    online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {online ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              {isOwnProfile && (
                <button
                  onClick={() => setEditOpen(true)}
                  className="mb-1 text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                  data-testid="edit-own-profile-btn"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}
            </div>

            {loading && (
              <div className="flex items-center gap-2 py-4">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-500">Loading profile…</span>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500 py-2">Could not load profile.</p>
            )}

            {user && !loading && (
              <>
                <h2 className="text-xl font-bold text-gray-900" data-testid="user-profile-display-name">
                  {user.displayName || user.username}
                </h2>
                <p className="text-sm text-gray-500 mb-1">@{user.username}</p>

                {user.statusMessage && (
                  <p className="text-xs text-blue-600 mb-2 italic" data-testid="user-profile-status">
                    {user.statusMessage}
                  </p>
                )}

                {user.bio && (
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed" data-testid="user-profile-bio">
                    {user.bio}
                  </p>
                )}

                {memberSince && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 border-t border-gray-100 pt-3">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Member since {memberSince}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {editOpen && user && (
        <EditProfileModal
          user={currentUser ?? user}
          onClose={() => setEditOpen(false)}
        />
      )}
    </>
  )
}
