import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import BrandLogo from '../components/ui/BrandLogo'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

/**
 * Standalone OTP verification page — used when the user navigates directly
 * to /verify-email (e.g., from a link in the verification email that includes
 * ?email=user@example.com) rather than completing the flow in RegisterForm.
 */
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const prefilledEmail = searchParams.get('email') ?? ''

  const [email, setEmail] = useState(prefilledEmail)
  const [otp, setOtp] = useState('')
  const [resendMsg, setResendMsg] = useState('')
  const [done, setDone] = useState(false)

  const { verifyEmailOtp, resendVerification, pendingVerificationEmail, isLoading, error } = useAuthStore()
  const navigate = useNavigate()

  const verificationEmail = pendingVerificationEmail ?? email

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await verifyEmailOtp(verificationEmail, otp)
      setDone(true)
    } catch {
      // error in store
    }
  }

  const handleResend = async () => {
    try {
      const msg = await resendVerification(verificationEmail)
      setResendMsg(msg)
    } catch {
      setResendMsg('Could not resend. Please try again.')
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(8,145,178,0.12),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)]">
      <div className="w-full max-w-sm overflow-hidden rounded-[28px] border border-white/70 bg-white/88 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl px-8 py-10">
        <div className="flex justify-center mb-8">
          <BrandLogo size="sm" tone="dark" />
        </div>

        {done ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Email verified!</h2>
            <p className="text-sm text-slate-500 mb-6">Your account is active.</p>
            <Button onClick={() => navigate('/chat')} className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800">
              Go to chat
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-slate-900 mb-2 text-center">Verify your email</h2>
            <p className="text-sm text-slate-500 mb-6 text-center">
              Enter the 6-digit code sent to your email.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </div>
              )}

              {!prefilledEmail && (
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              )}

              <Input
                label="Verification Code"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                required
                maxLength={6}
                autoFocus
                className="h-12 rounded-xl text-center text-xl tracking-widest font-mono"
              />

              <Button
                type="submit"
                loading={isLoading}
                className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                size="lg"
              >
                Verify
              </Button>
            </form>

            <div className="mt-5 text-center space-y-2">
              {resendMsg ? (
                <p className="text-sm text-teal-700">{resendMsg}</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-sm text-slate-500 hover:text-teal-700 font-medium"
                >
                  Resend code
                </button>
              )}
              <div>
                <Link to="/login" className="text-sm font-medium text-slate-400 hover:text-teal-700">
                  Back to sign in
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
