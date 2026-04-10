import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import BrandLogo from '../components/ui/BrandLogo'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const forgotPassword = useAuthStore((s) => s.forgotPassword)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      await forgotPassword(email)
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(8,145,178,0.12),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)]">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/70 bg-white/88 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl px-8 py-10">
        <div className="flex justify-center mb-8">
          <BrandLogo size="sm" tone="dark" />
        </div>

        {submitted ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Check your email</h2>
            <p className="text-sm text-slate-500 mb-6">
              If that email is registered, we've sent a password reset link. It expires in 1 hour.
            </p>
            <Link to="/login" className="text-sm font-semibold text-teal-700 hover:text-slate-900">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Forgot password?</h2>
            <p className="text-sm text-slate-500 mb-7">
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </div>
              )}
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                autoFocus
                className="h-12 rounded-xl border-slate-200 bg-slate-50/72 focus:ring-teal-500"
              />
              <Button
                type="submit"
                loading={isLoading}
                className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-700 shadow-[0_14px_32px_rgba(15,23,42,0.16)]"
                size="lg"
              >
                Send reset link
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Remembered it?{' '}
              <Link to="/login" className="font-semibold text-teal-700 hover:text-slate-900">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
