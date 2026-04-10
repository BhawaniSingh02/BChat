import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ChatPage from './pages/ChatPage'
import DownloadPage from './pages/DownloadPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'

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
  return <>{children}</>
}

function RedirectIfAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const isInitialized = useAuthStore((s) => s.isInitialized)
  if (!isInitialized) return null   // still loading
  if (user) return <Navigate to="/chat" replace />
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
    <UpdateBanner />
    <BrowserRouter>
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
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </BrowserRouter>
    </>
  )
}
