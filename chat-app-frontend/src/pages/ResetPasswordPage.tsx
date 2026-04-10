import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import BrandLogo from '../components/ui/BrandLogo'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const resetPassword = useAuthStore((s) => s.resetPassword)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      await resetPassword(token, newPassword)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e?.response?.data?.detail ?? 'Reset link is invalid or has expired.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)]">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Invalid reset link.</p>
          <Link to="/forgot-password" className="text-sm font-semibold text-teal-700 hover:text-slate-900">
            Request a new one
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(8,145,178,0.12),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)]">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/70 bg-white/88 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl px-8 py-10">
        <div className="flex justify-center mb-8">
          <BrandLogo size="sm" tone="dark" />
        </div>

        {success ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Password reset!</h2>
            <p className="text-sm text-slate-500">Redirecting you to sign in…</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Set new password</h2>
            <p className="text-sm text-slate-500 mb-7">Must be at least 8 characters.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </div>
              )}
              <Input
                label="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                autoComplete="new-password"
                autoFocus
                className="h-12 rounded-xl border-slate-200 bg-slate-50/72 focus:ring-teal-500"
              />
              <Input
                label="Confirm password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your new password"
                required
                autoComplete="new-password"
                className="h-12 rounded-xl border-slate-200 bg-slate-50/72 focus:ring-teal-500"
              />
              <Button
                type="submit"
                loading={isLoading}
                className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-700 shadow-[0_14px_32px_rgba(15,23,42,0.16)]"
                size="lg"
              >
                Reset password
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              <Link to="/login" className="font-semibold text-teal-700 hover:text-slate-900">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
