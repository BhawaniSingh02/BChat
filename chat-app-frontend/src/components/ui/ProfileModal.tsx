import { useRef, useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { usersApi } from '../../api/users'
import type { UpdateProfileRequest, ChangePasswordRequest } from '../../types'
import Avatar from './Avatar'

type HandleStatus = 'current' | 'idle' | 'checking' | 'available' | 'unavailable'

type Tab = 'profile' | 'password' | 'privacy'

interface ProfileModalProps {
  open: boolean
  onClose: () => void
  /** Which tab to show when the modal opens (defaults to 'profile'). */
  initialTab?: Tab
}

const PRIVACY_LABEL: Record<string, string> = {
  EVERYONE: 'Everyone',
  NOBODY: 'Nobody',
  CONTACTS: 'My Contacts',
}

export default function ProfileModal({ open, onClose, initialTab = 'profile' }: ProfileModalProps) {
  const user = useAuthStore((s) => s.user)
  const { updateProfile, uploadAvatar, removeAvatar, changePassword, claimHandle } = useAuthStore()

  const [tab, setTab] = useState<Tab>('profile')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Profile tab state
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage ?? '')

  // Username (@handle) editing — separate API call with live availability check
  const [handle, setHandle] = useState(user?.uniqueHandle ?? '')
  const [handleStatus, setHandleStatus] = useState<HandleStatus>('current')
  const [handleReason, setHandleReason] = useState<string | null>(null)
  const [savingHandle, setSavingHandle] = useState(false)
  const handleSeq = useRef(0)

  // Privacy tab state
  const [lastSeenPrivacy, setLastSeenPrivacy] = useState<'EVERYONE' | 'NOBODY' | 'CONTACTS'>(user?.lastSeenPrivacy ?? 'EVERYONE')
  const [onlinePrivacy, setOnlinePrivacy] = useState<'EVERYONE' | 'NOBODY' | 'CONTACTS'>(user?.onlinePrivacy ?? 'EVERYONE')
  const [profilePhotoPrivacy, setProfilePhotoPrivacy] = useState<'EVERYONE' | 'NOBODY' | 'CONTACTS'>(user?.profilePhotoPrivacy ?? 'EVERYONE')

  // Password tab state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Avatar
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null)

  // Sync form when modal opens
  useEffect(() => {
    if (open && user) {
      setDisplayName(user.displayName ?? '')
      setBio(user.bio ?? '')
      setStatusMessage(user.statusMessage ?? '')
      setHandle(user.uniqueHandle ?? '')
      setHandleStatus('current')
      setHandleReason(null)
      setLastSeenPrivacy(user.lastSeenPrivacy ?? 'EVERYONE')
      setOnlinePrivacy(user.onlinePrivacy ?? 'EVERYONE')
      setProfilePhotoPrivacy(user.profilePhotoPrivacy ?? 'EVERYONE')
      setAvatarPreview(user.avatarUrl ?? null)
      setTab(initialTab)
      setError(null)
      setSuccess(null)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }, [open])

  // Keep avatar preview in sync when user store updates (e.g. after upload)
  useEffect(() => {
    setAvatarPreview(user?.avatarUrl ?? null)
  }, [user?.avatarUrl])

  // Debounced live availability check for the @username field.
  useEffect(() => {
    if (!open) return
    const value = handle.trim().toLowerCase()
    const current = (user?.uniqueHandle ?? '').toLowerCase()
    if (value === current) { setHandleStatus('current'); setHandleReason(null); return }
    if (!value) { setHandleStatus('idle'); setHandleReason(null); return }
    setHandleStatus('checking')
    const id = ++handleSeq.current
    const t = setTimeout(async () => {
      try {
        const res = await usersApi.checkHandle(value)
        if (id !== handleSeq.current) return // superseded by a newer keystroke
        setHandleStatus(res.available ? 'available' : 'unavailable')
        setHandleReason(res.available ? null : (res.reason ?? 'Not available'))
      } catch {
        if (id !== handleSeq.current) return
        setHandleStatus('idle')
      }
    }, 400)
    return () => clearTimeout(t)
  }, [handle, open, user?.uniqueHandle])

  if (!open || !user) return null

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown'

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
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { detail?: string; message?: string } } }
      flashError(e2?.response?.data?.detail ?? e2?.response?.data?.message ?? 'Failed to upload photo')
      setAvatarPreview(user?.avatarUrl ?? null)
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
      const payload: UpdateProfileRequest = {
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        statusMessage: statusMessage.trim() || undefined,
      }
      await updateProfile(payload)
      flashSuccess('Profile saved')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; message?: string } } }
      flashError(e?.response?.data?.detail ?? e?.response?.data?.message ?? 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveUsername() {
    const value = handle.trim().toLowerCase()
    if (handleStatus !== 'available' || savingHandle) return
    setSavingHandle(true)
    setError(null)
    try {
      await claimHandle(value)
      setHandleStatus('current')
      flashSuccess('Username updated')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; message?: string } } }
      flashError(e?.response?.data?.detail ?? e?.response?.data?.message ?? 'Could not update username')
    } finally {
      setSavingHandle(false)
    }
  }

  async function handleSavePrivacy() {
    setSaving(true)
    setError(null)
    try {
      const payload: UpdateProfileRequest = {
        lastSeenPrivacy: lastSeenPrivacy as UpdateProfileRequest['lastSeenPrivacy'],
        onlinePrivacy: onlinePrivacy as UpdateProfileRequest['onlinePrivacy'],
        profilePhotoPrivacy: profilePhotoPrivacy as UpdateProfileRequest['profilePhotoPrivacy'],
      }
      await updateProfile(payload)
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
      const payload: ChangePasswordRequest = { currentPassword, newPassword }
      await changePassword(payload)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      flashSuccess('Password changed successfully')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; detail?: string } } }
      flashError(e?.response?.data?.message ?? e?.response?.data?.detail ?? 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

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
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl">
        {/* Header gradient */}
        <div className="h-20 bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 flex-shrink-0" />

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

        {/* Avatar overlapping gradient */}
        <div className="px-6 -mt-8 flex items-end justify-between flex-shrink-0">
          <div
            className="relative group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            title="Change profile photo"
          >
            <div className="ring-4 ring-white rounded-full shadow-lg">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full object-cover"
                  data-testid="avatar-preview"
                />
              ) : (
                <Avatar name={user.displayName || user.uniqueHandle || user.username} size="xl" />
              )}
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <div className="mb-1 flex gap-2 text-xs">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="font-medium text-teal-700 hover:text-cyan-800"
              data-testid="change-photo-btn"
            >
              Change photo
            </button>
            {avatarPreview && (
              <button
                onClick={handleRemoveAvatar}
                className="text-red-500 hover:text-red-700 font-medium"
                data-testid="remove-photo-btn"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {/* Name + handle */}
        <div className="px-6 pt-2 pb-0 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900" data-testid="profile-display-name">
            {user.displayName || (user.uniqueHandle ? `@${user.uniqueHandle}` : user.username)}
          </h2>
          <p className="text-xs text-gray-500">@{user.uniqueHandle ?? user.username} · {user.email}</p>
          {user.statusMessage && (
            <p className="mt-0.5 text-xs italic text-teal-700" data-testid="profile-status-display">
              {user.statusMessage}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">Member since {memberSince}</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 mt-3 flex-shrink-0">
          {(['profile', 'password', 'privacy'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); setSuccess(null) }}
              className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors ${
                tab === t
                  ? 'text-teal-700 border-b-2 border-teal-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              data-testid={`profile-tab-${t}`}
            >
              {t === 'profile' ? 'Profile' : t === 'password' ? 'Password' : 'Privacy'}
            </button>
          ))}
        </div>

        {/* Scrollable tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {/* Feedback */}
          {success && (
            <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800" data-testid="profile-success">
              {success}
            </div>
          )}
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" data-testid="profile-error">
              {error}
            </div>
          )}

          {/* ── Profile Tab ── */}
          {tab === 'profile' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
                <div className="flex items-center rounded-lg border border-gray-200 px-3 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-500/20">
                  <span className="text-gray-400 select-none">@</span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                    placeholder="username"
                    maxLength={20}
                    className="flex-1 bg-transparent px-2 py-2 text-sm focus:outline-none"
                    aria-label="Username"
                    data-testid="handle-input"
                  />
                  {handleStatus === 'checking' && (
                    <svg className="h-4 w-4 animate-spin text-gray-300" viewBox="0 0 24 24" fill="none" data-testid="handle-checking">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  )}
                  {handleStatus === 'available' && (
                    <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} data-testid="handle-available">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {handleStatus === 'unavailable' && (
                    <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} data-testid="handle-unavailable">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-xs" data-testid="handle-hint">
                    {handleStatus === 'current' && <span className="text-gray-400">This is your current username</span>}
                    {handleStatus === 'checking' && <span className="text-gray-400">Checking availability…</span>}
                    {handleStatus === 'available' && <span className="text-emerald-600">@{handle.trim().toLowerCase()} is available</span>}
                    {handleStatus === 'unavailable' && <span className="text-red-500">{handleReason}</span>}
                    {handleStatus === 'idle' && <span className="text-gray-400">3–20 chars · letters, numbers, . and _</span>}
                  </p>
                  <button
                    onClick={handleSaveUsername}
                    disabled={handleStatus !== 'available' || savingHandle}
                    className="flex-shrink-0 text-xs font-medium text-teal-700 hover:text-teal-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                    data-testid="save-handle-btn"
                  >
                    {savingHandle ? 'Saving…' : 'Save username'}
                  </button>
                </div>
                <p className="mt-1 text-[11px] leading-tight text-gray-400">
                  Changing your username frees the old one for others to claim. Your chats and messages stay intact.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={user.username}
                  maxLength={60}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  data-testid="display-name-input"
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
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
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
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  data-testid="bio-input"
                />
                <p className="text-xs text-gray-400 text-right">{bio.length}/250</p>
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:bg-slate-500"
                data-testid="save-profile-btn"
              >
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
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
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
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
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
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
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  data-testid="confirm-password-input"
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:bg-slate-500"
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
                onChange={(v: string) => setLastSeenPrivacy(v as 'EVERYONE' | 'NOBODY' | 'CONTACTS')}
                testId="last-seen-privacy"
              />
              <PrivacySelect
                label="Online Status"
                value={onlinePrivacy}
                options={['EVERYONE', 'NOBODY']}
                onChange={(v: string) => setOnlinePrivacy(v as 'EVERYONE' | 'NOBODY' | 'CONTACTS')}
                testId="online-privacy"
              />
              <PrivacySelect
                label="Profile Photo"
                value={profilePhotoPrivacy}
                options={['EVERYONE', 'NOBODY', 'CONTACTS']}
                onChange={(v: string) => setProfilePhotoPrivacy(v as 'EVERYONE' | 'NOBODY' | 'CONTACTS')}
                testId="profile-photo-privacy"
              />

              <button
                onClick={handleSavePrivacy}
                disabled={saving}
                className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:bg-slate-500"
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
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
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
