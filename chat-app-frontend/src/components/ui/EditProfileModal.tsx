import { useEffect, useRef, useState } from 'react'
import type { User, UpdateProfileRequest, ChangePasswordRequest } from '../../types'
import { useAuthStore } from '../../store/authStore'
import { usersApi } from '../../api/users'
import Avatar from './Avatar'

type Tab = 'profile' | 'password' | 'privacy'

interface EditProfileModalProps {
  user: User
  onClose: () => void
}

const PRIVACY_LABEL: Record<string, string> = {
  EVERYONE: 'Everyone',
  NOBODY: 'Nobody',
  CONTACTS: 'My Contacts',
}

export default function EditProfileModal({ user, onClose }: EditProfileModalProps) {
  const [tab, setTab] = useState<Tab>('profile')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Profile tab state
  const [displayName, setDisplayName] = useState(user.displayName ?? '')
  const [bio, setBio] = useState(user.bio ?? '')
  const [statusMessage, setStatusMessage] = useState(user.statusMessage ?? '')

  // Username (@handle) editing
  const [handle, setHandle] = useState(user.uniqueHandle ?? '')
  const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle')
  const [handleReason, setHandleReason] = useState<string | null>(null)
  const [savingHandle, setSavingHandle] = useState(false)
  const handleSeq = useRef(0)

  // Privacy tab state
  const [lastSeenPrivacy, setLastSeenPrivacy] = useState<string>(user.lastSeenPrivacy ?? 'EVERYONE')
  const [onlinePrivacy, setOnlinePrivacy] = useState<string>(user.onlinePrivacy ?? 'EVERYONE')
  const [profilePhotoPrivacy, setProfilePhotoPrivacy] = useState<string>(user.profilePhotoPrivacy ?? 'EVERYONE')

  // Password tab state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatarUrl ?? null)

  const { updateProfile, uploadAvatar, removeAvatar, changePassword, claimHandle } = useAuthStore()

  // Debounced @username availability check.
  useEffect(() => {
    const value = handle.trim().toLowerCase()
    if (!value || value === (user.uniqueHandle ?? '')) {
      setHandleStatus('idle'); setHandleReason(null); return
    }
    setHandleStatus('checking')
    const id = ++handleSeq.current
    const t = setTimeout(async () => {
      try {
        const res = await usersApi.checkHandle(value)
        if (id !== handleSeq.current) return
        setHandleStatus(res.available ? 'available' : 'unavailable')
        setHandleReason(res.available ? null : (res.reason ?? 'Not available'))
      } catch {
        if (id === handleSeq.current) setHandleStatus('idle')
      }
    }, 400)
    return () => clearTimeout(t)
  }, [handle, user.uniqueHandle])

  async function handleSaveUsername() {
    setSavingHandle(true)
    try {
      await claimHandle(handle.trim().toLowerCase())
      flashSuccess('Username updated')
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      flashError(detail ?? 'Could not update username')
    } finally {
      setSavingHandle(false)
    }
  }

  function flashSuccess(msg: string) {
    setSuccess(msg)
    setError(null)
    setTimeout(() => setSuccess(null), 3000)
  }

  function flashError(msg: string) {
    setError(msg)
    setSuccess(null)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setAvatarPreview(preview)
    try {
      await uploadAvatar(file)
      flashSuccess('Profile photo updated')
    } catch {
      flashError('Failed to upload photo')
      setAvatarPreview(user.avatarUrl ?? null)
    }
  }

  async function handleRemoveAvatar() {
    try {
      await removeAvatar()
      setAvatarPreview(null)
      flashSuccess('Profile photo removed')
    } catch {
      flashError('Failed to remove photo')
    }
  }

  async function handleSaveProfile() {
    setSaving(true)
    setError(null)
    try {
      const data: UpdateProfileRequest = {
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        statusMessage: statusMessage.trim() || undefined,
      }
      await updateProfile(data)
      flashSuccess('Profile saved')
    } catch {
      flashError('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleSavePrivacy() {
    setSaving(true)
    setError(null)
    try {
      const data: UpdateProfileRequest = {
        lastSeenPrivacy: lastSeenPrivacy as UpdateProfileRequest['lastSeenPrivacy'],
        onlinePrivacy: onlinePrivacy as UpdateProfileRequest['onlinePrivacy'],
        profilePhotoPrivacy: profilePhotoPrivacy as UpdateProfileRequest['profilePhotoPrivacy'],
      }
      await updateProfile(data)
      flashSuccess('Privacy settings saved')
    } catch {
      flashError('Failed to save privacy settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      flashError('New passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      flashError('New password must be at least 6 characters')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const data: ChangePasswordRequest = { currentPassword, newPassword }
      await changePassword(data)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      flashSuccess('Password changed successfully')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      flashError(e?.response?.data?.message ?? 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Edit profile"
      data-testid="edit-profile-modal"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        data-testid="edit-profile-backdrop"
      />

      <div className="relative bg-white dark:bg-[#1a242b] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg p-1.5 transition-colors"
            aria-label="Close"
            data-testid="close-edit-profile-btn"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(['profile', 'password', 'privacy'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); setSuccess(null) }}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              data-testid={`edit-profile-tab-${t}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Feedback */}
          {success && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2" data-testid="edit-profile-success">
              {success}
            </div>
          )}
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" data-testid="edit-profile-error">
              {error}
            </div>
          )}

          {/* ── Profile Tab ── */}
          {tab === 'profile' && (
            <>
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Profile photo"
                      className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-md"
                      data-testid="avatar-preview"
                    />
                  ) : (
                    <Avatar name={user.username} size="xl" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  data-testid="avatar-file-input"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    data-testid="change-photo-btn"
                  >
                    Change photo
                  </button>
                  {avatarPreview && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                      data-testid="remove-photo-btn"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
                  <div className="flex gap-2">
                    <div className="flex flex-1 items-center px-3 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-400">
                      <span className="text-gray-400 select-none">@</span>
                      <input
                        type="text"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                        placeholder="username"
                        maxLength={20}
                        className="flex-1 px-2 py-2 bg-transparent text-sm focus:outline-none"
                        data-testid="username-input"
                      />
                    </div>
                    <button
                      onClick={handleSaveUsername}
                      disabled={handleStatus !== 'available' || savingHandle}
                      className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 transition-colors"
                      data-testid="save-username-btn"
                    >
                      {savingHandle ? '…' : 'Save'}
                    </button>
                  </div>
                  <p className="text-xs mt-1 h-4">
                    {handleStatus === 'checking' && <span className="text-gray-400">Checking…</span>}
                    {handleStatus === 'available' && <span className="text-emerald-600">@{handle.trim().toLowerCase()} is available</span>}
                    {handleStatus === 'unavailable' && <span className="text-red-500">{handleReason}</span>}
                    {handleStatus === 'idle' && <span className="text-gray-400">People find you by this @username</span>}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    maxLength={60}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    data-testid="displayname-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <input
                    type="text"
                    value={statusMessage}
                    onChange={(e) => setStatusMessage(e.target.value)}
                    placeholder="Hey there! I am using Baaat"
                    maxLength={139}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    data-testid="status-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell people a little about yourself"
                    rows={3}
                    maxLength={250}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
                    data-testid="bio-input"
                  />
                  <p className="text-xs text-gray-400 text-right mt-0.5">{bio.length}/250</p>
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
                data-testid="save-profile-btn"
              >
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </>
          )}

          {/* ── Password Tab ── */}
          {tab === 'password' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  data-testid="current-password-input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  data-testid="new-password-input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  data-testid="confirm-password-input"
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
                data-testid="change-password-btn"
              >
                {saving ? 'Changing…' : 'Change Password'}
              </button>
            </div>
          )}

          {/* ── Privacy Tab ── */}
          {tab === 'privacy' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">Control who can see your information.</p>

              <PrivacySelect
                label="Last Seen"
                value={lastSeenPrivacy}
                options={['EVERYONE', 'NOBODY', 'CONTACTS']}
                onChange={setLastSeenPrivacy}
                testId="last-seen-privacy"
              />
              <PrivacySelect
                label="Online Status"
                value={onlinePrivacy}
                options={['EVERYONE', 'NOBODY']}
                onChange={setOnlinePrivacy}
                testId="online-privacy"
              />
              <PrivacySelect
                label="Profile Photo"
                value={profilePhotoPrivacy}
                options={['EVERYONE', 'NOBODY', 'CONTACTS']}
                onChange={setProfilePhotoPrivacy}
                testId="profile-photo-privacy"
              />

              <button
                onClick={handleSavePrivacy}
                disabled={saving}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
                data-testid="save-privacy-btn"
              >
                {saving ? 'Saving…' : 'Save Privacy Settings'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface PrivacySelectProps {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  testId: string
}

function PrivacySelect({ label, value, options, onChange, testId }: PrivacySelectProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white dark:bg-[#2a3942] dark:border-gray-700 dark:text-gray-100"
        data-testid={testId}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {PRIVACY_LABEL[opt] ?? opt}
          </option>
        ))}
      </select>
    </div>
  )
}
