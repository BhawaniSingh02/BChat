import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { usersApi } from '../../api/users'
import Button from '../ui/Button'
import BrandLogo from '../ui/BrandLogo'

type Status = 'idle' | 'checking' | 'available' | 'unavailable'

/**
 * Onboarding step shown when an authenticated user has no public @username yet.
 * Instagram-style: type a handle, see live availability, then claim it.
 */
export default function ChooseUsername() {
  const { user, claimHandle, clearJustRegistered } = useAuthStore()
  const [handle, setHandle] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [reason, setReason] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)

  // Debounced live availability check.
  useEffect(() => {
    const value = handle.trim().toLowerCase()
    setError(null)
    if (!value) { setStatus('idle'); setReason(null); return }
    setStatus('checking')
    const id = ++seq.current
    const t = setTimeout(async () => {
      try {
        const res = await usersApi.checkHandle(value)
        if (id !== seq.current) return // a newer keystroke superseded this check
        setStatus(res.available ? 'available' : 'unavailable')
        setReason(res.available ? null : (res.reason ?? 'Not available'))
      } catch {
        if (id !== seq.current) return
        setStatus('idle')
      }
    }, 400)
    return () => clearTimeout(t)
  }, [handle])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status !== 'available' || saving) return
    setSaving(true)
    setError(null)
    try {
      await claimHandle(handle.trim().toLowerCase())
      clearJustRegistered()
      // No navigation needed — the route guard re-renders the app now that a handle exists.
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? 'Could not set username. Try another.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(8,145,178,0.12),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)]">
      <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white/90 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl">
        <div className="mb-6 flex justify-center">
          <BrandLogo size="md" />
        </div>

        <h2 className="mb-1 text-center text-2xl font-bold tracking-[-0.02em] text-slate-900">
          Choose your username
        </h2>
        <p className="mb-6 text-center text-sm text-slate-500">
          This is how people will find and mention you{user?.displayName ? `, ${user.displayName}` : ''}.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <div>
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/70 px-3 focus-within:ring-2 focus-within:ring-teal-500">
              <span className="text-slate-400 text-lg select-none">@</span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                placeholder="username"
                autoFocus
                maxLength={20}
                className="h-12 flex-1 bg-transparent px-2 text-slate-900 placeholder:text-slate-400 focus:outline-none"
                aria-label="Username"
                data-testid="choose-username-input"
              />
              {status === 'available' && (
                <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} data-testid="handle-available">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {status === 'unavailable' && (
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} data-testid="handle-unavailable">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <p className="mt-2 h-4 text-xs">
              {status === 'checking' && <span className="text-slate-400">Checking availability…</span>}
              {status === 'available' && <span className="text-emerald-600">@{handle} is available</span>}
              {status === 'unavailable' && <span className="text-red-500">{reason}</span>}
              {status === 'idle' && <span className="text-slate-400">3–20 characters · letters, numbers, . and _</span>}
            </p>
          </div>

          <Button
            type="submit"
            loading={saving}
            disabled={status !== 'available'}
            className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-700 shadow-[0_14px_32px_rgba(15,23,42,0.16)] disabled:opacity-50"
            size="lg"
            data-testid="claim-username-btn"
          >
            Continue
          </Button>
        </form>
      </div>
    </div>
  )
}
