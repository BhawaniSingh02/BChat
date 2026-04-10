import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import Button from '../ui/Button'
import Input from '../ui/Input'
import BrandLogo from '../ui/BrandLogo'

type Step = 'details' | 'otp' | 'success'

export default function RegisterForm() {
  const [step, setStep] = useState<Step>('details')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [resendMessage, setResendMessage] = useState('')
  const [darkMode, setDarkMode] = useState(false)

  const { register, verifyEmailOtp, resendVerification, clearError, pendingVerificationEmail, isLoading, error, user } = useAuthStore()
  const navigate = useNavigate()

  // Step 1: submit registration details
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await register(displayName, email, password)
      setStep('otp')
    } catch {
      // error set in store
    }
  }

  // Step 2: submit OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const verificationEmail = pendingVerificationEmail ?? email
    try {
      await verifyEmailOtp(verificationEmail, otp)
      setStep('success')
    } catch {
      // error set in store
    }
  }

  // Resend OTP
  const handleResend = async () => {
    const verificationEmail = pendingVerificationEmail ?? email
    try {
      const msg = await resendVerification(verificationEmail)
      setResendMessage(msg)
    } catch {
      setResendMessage('Could not resend. Please try again.')
    }
  }

  const darkBg = 'bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(8,145,178,0.12),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]'
  const lightBg = 'bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(8,145,178,0.12),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)]'

  return (
    <div className={`min-h-screen w-full overflow-x-hidden flex items-center justify-center p-4 transition-colors ${darkMode ? darkBg : lightBg}`}>
      {/* Dark mode toggle */}
      <button
        type="button"
        onClick={() => setDarkMode((v) => !v)}
        className={`fixed right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition-colors md:right-6 md:top-6 ${
          darkMode
            ? 'border-white/10 bg-slate-900/70 text-slate-100 shadow-[0_12px_30px_rgba(2,6,23,0.35)] hover:bg-slate-800/80'
            : 'border-white/80 bg-white/88 text-slate-700 shadow-[0_12px_26px_rgba(15,23,42,0.10)] hover:bg-white'
        }`}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {darkMode ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <circle cx="12" cy="12" r="4.2" />
            <path strokeLinecap="round" d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.72 5.28l-1.56 1.56M6.84 17.16l-1.56 1.56M18.72 18.72l-1.56-1.56M6.84 6.84L5.28 5.28" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.742 13.045a8.088 8.088 0 0 1-9.787-9.787 8.75 8.75 0 1 0 9.787 9.787Z" />
          </svg>
        )}
      </button>

      <div className={`w-full md:max-w-5xl overflow-hidden rounded-[28px] border backdrop-blur-xl md:flex transition-colors ${
        darkMode
          ? 'border-white/10 bg-slate-950/80 shadow-[0_30px_90px_rgba(2,6,23,0.52)]'
          : 'border-white/70 bg-white/88 shadow-[0_30px_90px_rgba(15,23,42,0.14)]'
      }`}>
        {/* Left panel */}
        <div className={`relative hidden md:flex md:w-[42%] overflow-hidden items-center justify-center p-10 text-white ${
          darkMode
            ? 'bg-[linear-gradient(160deg,_#020617_0%,_#0f172a_54%,_#134e4a_100%)]'
            : 'bg-[linear-gradient(160deg,_#0f172a_0%,_#111827_54%,_#155e75_100%)]'
        }`}>
          <div className="absolute -left-16 top-10 h-52 w-52 rounded-full bg-emerald-400/12 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative px-10 py-12">
            <BrandLogo size="lg" tone="light" stacked interactive />
          </div>
        </div>

        {/* Right panel */}
        <div className={`w-full md:flex-1 flex flex-col justify-center px-5 py-7 sm:px-8 md:px-14 md:py-14 transition-colors ${
          darkMode ? 'bg-slate-950/34' : 'bg-white/84'
        }`}>
          <div className="md:hidden flex items-center justify-center gap-3 mb-7">
            <BrandLogo size="sm" tone={darkMode ? 'light' : 'dark'} />
          </div>

          <div className="mx-auto w-full max-w-md">

            {/* ── Step indicator ── */}
            {step !== 'success' && (
              <div className="flex items-center gap-2 mb-6">
                {(['details', 'otp'] as Step[]).map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full transition-colors ${
                      step === s
                        ? 'bg-teal-500'
                        : i < ['details', 'otp'].indexOf(step)
                          ? 'bg-teal-300'
                          : darkMode ? 'bg-slate-700' : 'bg-slate-200'
                    }`} />
                    {i < 1 && <div className={`h-px w-6 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />}
                  </div>
                ))}
              </div>
            )}

            {/* ── Step 1: Account details ── */}
            {step === 'details' && (
              <>
                <h2 className={`mb-2 text-2xl font-bold tracking-[-0.03em] sm:text-[2rem] ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Create account
                </h2>
                <p className={`mb-8 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Start with Baaat
                </p>

                <form onSubmit={handleRegister} className="space-y-4">
                  {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700" role="alert">
                      {error}
                    </div>
                  )}

                  <Input
                    label="Display Name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name (e.g. Alice Smith)"
                    required
                    minLength={1}
                    maxLength={50}
                    autoFocus
                    className={`h-12 rounded-xl focus:ring-teal-500 ${
                      darkMode
                        ? 'border-slate-800 bg-slate-900/72 text-slate-100 placeholder:text-slate-500'
                        : 'border-slate-200 bg-slate-50/72'
                    }`}
                  />

                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className={`h-12 rounded-xl focus:ring-teal-500 ${
                      darkMode
                        ? 'border-slate-800 bg-slate-900/72 text-slate-100 placeholder:text-slate-500'
                        : 'border-slate-200 bg-slate-50/72'
                    }`}
                  />

                  <Input
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={`h-12 rounded-xl focus:ring-teal-500 ${
                      darkMode
                        ? 'border-slate-800 bg-slate-900/72 text-slate-100 placeholder:text-slate-500'
                        : 'border-slate-200 bg-slate-50/72'
                    }`}
                  />

                  <Button
                    type="submit"
                    loading={isLoading}
                    className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-700 shadow-[0_14px_32px_rgba(15,23,42,0.16)]"
                    size="lg"
                  >
                    Continue
                  </Button>
                </form>

                <p className={`mt-7 text-center text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Already have an account?{' '}
                  <Link to="/login" className={`font-semibold ${darkMode ? 'text-teal-300 hover:text-white' : 'text-teal-700 hover:text-slate-900'}`}>
                    Sign in
                  </Link>
                </p>
              </>
            )}

            {/* ── Step 2: OTP verification ── */}
            {step === 'otp' && (
              <>
                <button
                  type="button"
                  onClick={() => { setStep('details'); setOtp(''); setResendMessage(''); clearError() }}
                  className={`mb-6 inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>

                <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>

                <h2 className={`mb-2 text-2xl font-bold tracking-[-0.03em] sm:text-[2rem] ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Check your email
                </h2>
                <p className={`mb-8 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  We sent a 6-digit code to <span className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{pendingVerificationEmail ?? email}</span>
                </p>

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700" role="alert">
                      {error}
                    </div>
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
                    className={`h-12 rounded-xl text-center text-xl tracking-widest font-mono focus:ring-teal-500 ${
                      darkMode
                        ? 'border-slate-800 bg-slate-900/72 text-slate-100 placeholder:text-slate-500'
                        : 'border-slate-200 bg-slate-50/72'
                    }`}
                  />

                  <Button
                    type="submit"
                    loading={isLoading}
                    className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-700 shadow-[0_14px_32px_rgba(15,23,42,0.16)]"
                    size="lg"
                  >
                    Verify & Continue
                  </Button>
                </form>

                <div className="mt-5 text-center">
                  {resendMessage ? (
                    <p className={`text-sm ${darkMode ? 'text-teal-400' : 'text-teal-700'}`}>{resendMessage}</p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      className={`text-sm font-medium ${darkMode ? 'text-slate-400 hover:text-teal-300' : 'text-slate-500 hover:text-teal-700'}`}
                    >
                      Didn't get it? Resend code
                    </button>
                  )}
                </div>
              </>
            )}

            {/* ── Step 3: Success ── */}
            {step === 'success' && (
              <>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <h2 className={`mb-2 text-2xl font-bold tracking-[-0.03em] sm:text-[2rem] ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  You're in!
                </h2>
                <p className={`mb-6 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Your account is ready. Here's your unique handle — share it so others can find you.
                </p>

                {user?.uniqueHandle && (
                  <div className={`mb-6 rounded-xl border px-4 py-3 ${
                    darkMode ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Your handle</p>
                    <p className={`font-mono font-semibold text-lg ${darkMode ? 'text-teal-300' : 'text-teal-700'}`}>
                      @{user.uniqueHandle}
                    </p>
                  </div>
                )}

                <Button
                  type="button"
                  onClick={() => navigate('/chat')}
                  className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-700 shadow-[0_14px_32px_rgba(15,23,42,0.16)]"
                  size="lg"
                >
                  Go to Baaat
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
