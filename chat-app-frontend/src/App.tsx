import { useEffect, useState, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { useAuthStore } from './store/authStore'
import ChooseUsername from './components/auth/ChooseUsername'

// Route-level code splitting — each page ships as its own chunk, fetched on navigation
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const DownloadPage = lazy(() => import('./pages/DownloadPage'))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const CookiePolicyPage = lazy(() => import('./pages/CookiePolicyPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'))

function RouteFallback() {
  return <div className="h-screen w-screen" style={{ background: '#0b141a' }} />
}

// ─── Desktop update banner (only shown inside Electron) ───────────────────────
function UpdateBanner() {
  const [state, setState] = useState<'idle' | 'downloading' | 'ready'>('idle')
  const [version, setVersion] = useState('')
  const [percent, setPercent] = useState(0)

  useEffect(() => {
    if (!window.electronAPI) return

    window.electronAPI.onUpdateAvailable((info) => {
      setVersion(info.version)
      setState('downloading')
    })

    window.electronAPI.onUpdateProgress((progress) => {
      setPercent(Math.round(progress.percent))
    })

    window.electronAPI.onUpdateDownloaded((info) => {
      setVersion(info.version)
      setState('ready')
    })
  }, [])

  if (state === 'idle') return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 99999,
      background: 'linear-gradient(90deg, #1a1a2e, #16213e)',
      color: '#a78bfa',
      fontSize: '13px',
      fontWeight: 600,
      textAlign: 'center',
      padding: '7px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      letterSpacing: '0.3px',
    }}>
      {state === 'downloading' ? (
        <>
          <span style={{ fontSize: '15px' }}>⬇</span>
          Downloading update v{version}
          {percent > 0 && <span style={{ color: '#c4b5fd' }}>— {percent}%</span>}
        </>
      ) : (
        <>
          <span style={{ fontSize: '15px' }}>✓</span>
          <span style={{ color: '#86efac' }}>v{version} ready</span>
          — restart to apply
        </>
      )}
    </div>
  )
}

/**
 * Guards authenticated routes. Waits for the initial fetchMe to complete
 * before deciding — prevents a flash redirect to /login on page refresh
 * when the user has a valid session cookie.
 */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const isInitialized = useAuthStore((s) => s.isInitialized)
  if (!isInitialized) return null   // still loading — render nothing
  if (!user) return <Navigate to="/login" replace />
  // Authenticated but hasn't picked a public @username yet → force onboarding.
  if (!user.uniqueHandle) return <ChooseUsername />
  return <>{children}</>
}

function RedirectIfAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const justRegistered = useAuthStore((s) => s.justRegistered)
  if (!isInitialized) return null   // still loading
  // Don't redirect right after a fresh registration — let RegisterForm show the
  // "You're in! here's your @handle" success screen before the user continues.
  if (user && !justRegistered) return <Navigate to="/chat" replace />
  return <>{children}</>
}

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  // Handle 401 responses dispatched from the axios interceptor (outside React context)
  useEffect(() => {
    const handleUnauthorized = () => logout()
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [logout])

  return (
    <>
    <Analytics />
    <UpdateBanner />
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route
          path="/login"
          element={
            <RedirectIfAuth>
              <LoginPage />
            </RedirectIfAuth>
          }
        />
        <Route
          path="/register"
          element={
            <RedirectIfAuth>
              <RegisterPage />
            </RedirectIfAuth>
          }
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route
          path="/chat"
          element={
            <RequireAuth>
              <ChatPage />
            </RequireAuth>
          }
        />
        <Route path="/download" element={<DownloadPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/cookie-policy" element={<CookiePolicyPage />} />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
    </>
  )
}
