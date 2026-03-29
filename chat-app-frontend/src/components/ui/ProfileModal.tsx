import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import Avatar from './Avatar'
import type { UpdateProfileRequest } from '../../types'

interface ProfileModalProps {
  open: boolean
  onClose: () => void
}

export default function ProfileModal({ open, onClose }: ProfileModalProps) {
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Re-sync form fields whenever the modal opens or user data changes
  useEffect(() => {
    if (open && user) {
      setDisplayName(user.displayName ?? '')
      setBio(user.bio ?? '')
      setEditing(false)
      setError(null)
      setSuccess(false)
    }
  }, [open, user?.displayName, user?.bio])

  if (!open || !user) return null

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload: UpdateProfileRequest = {
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
      }
      await updateProfile(payload)
      setSuccess(true)
      setEditing(false)
      setTimeout(() => setSuccess(false), 2000)
    } catch {
      setError('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setDisplayName(user.displayName ?? '')
    setBio(user.bio ?? '')
    setEditing(false)
    setError(null)
  }

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Profile"
      data-testid="profile-modal"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        data-testid="profile-backdrop"
      />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header gradient */}
        <div className="h-24 bg-gradient-to-br from-emerald-500 to-green-700" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/80 hover:text-white bg-white/20 hover:bg-white/30 rounded-lg p-1.5 transition-colors"
          aria-label="Close profile"
          data-testid="close-profile-btn"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Avatar overlapping header */}
        <div className="px-6 pb-6">
          <div className="-mt-10 mb-3 flex items-end justify-between">
            <div className="ring-4 ring-white rounded-full shadow-lg">
              <Avatar name={user.username} size="xl" />
            </div>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-colors border border-emerald-200"
                data-testid="edit-profile-btn"
              >
                Edit Profile
              </button>
            ) : null}
          </div>

          {/* Name & handle */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900" data-testid="profile-display-name">
              {user.displayName || user.username}
            </h2>
            <p className="text-sm text-gray-500">@{user.username}</p>
          </div>

          {/* Bio */}
          {!editing && (
            <p className="text-sm text-gray-600 mb-4" data-testid="profile-bio">
              {user.bio || (
                <span className="text-gray-400 italic">No bio yet.</span>
              )}
            </p>
          )}

          {/* Edit form */}
          {editing && (
            <div className="space-y-3 mb-4" data-testid="profile-edit-form">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={user.username}
                  maxLength={50}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  data-testid="display-name-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell people a bit about yourself…"
                  maxLength={200}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  data-testid="bio-input"
                />
                <p className="text-xs text-gray-400 text-right mt-0.5">{bio.length}/200</p>
              </div>
              {error && (
                <p className="text-xs text-red-500" data-testid="profile-error">{error}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                  data-testid="save-profile-btn"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  data-testid="cancel-profile-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {success && (
            <p className="text-xs text-emerald-600 mb-3 font-medium" data-testid="profile-success">
              ✓ Profile updated
            </p>
          )}

          {/* Info rows */}
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span data-testid="profile-email">{user.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Member since {memberSince}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
