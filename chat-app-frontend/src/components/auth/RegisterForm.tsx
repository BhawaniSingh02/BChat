import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function RegisterForm() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { register, isLoading, error } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await register(username, email, password)
      navigate('/chat')
    } catch {
      // error set in store
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-700 to-teal-700 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-4xl flex bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Left panel — branding (desktop only) */}
        <div className="hidden md:flex md:w-2/5 bg-gradient-to-br from-green-500 to-green-700 flex-col items-center justify-center p-10 text-white">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <span className="text-5xl">💬</span>
          </div>
          <h1 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 900, letterSpacing: '-0.02em' }} className="text-3xl mb-3">Baaat</h1>
          <p className="text-green-100 text-center text-sm leading-relaxed">
            Join thousands of users already chatting on Baaat.
          </p>
          <div className="mt-8 space-y-3 w-full">
            {[
              { icon: '🚀', text: 'Get started in seconds' },
              { icon: '🌐', text: 'Public & private rooms' },
              { icon: '📁', text: 'File & image sharing' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2.5">
                <span className="text-xl">{f.icon}</span>
                <span className="text-sm font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 sm:p-8 md:p-12">
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
            <div className="md:hidden text-center mb-5">
              <div className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <span className="text-white text-xl">💬</span>
              </div>
              <h1 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 900, letterSpacing: '-0.02em' }} className="text-2xl text-gray-900">Baaat</h1>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Create account</h2>
            <p className="text-gray-500 text-sm mb-5 sm:mb-7">Join Baaat today — it's free</p>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm" role="alert">
                  {error}
                </div>
              )}

              <Input
                label="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username (3-30 chars)"
                required
                minLength={3}
                maxLength={30}
                autoFocus
              />

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
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
              />

              <Button type="submit" loading={isLoading} className="w-full" size="lg">
                Create Account
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5 sm:mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-green-600 hover:text-green-700 font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
