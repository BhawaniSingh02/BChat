import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '../../store/authStore'
import { tokenProvider } from '../../api/tokenProvider'
import { authApi } from '../../api/auth'

vi.mock('../../api/auth')

const mockUser = {
  id: 'user-1',
  username: 'alice.1234',
  email: 'alice@example.com',
  uniqueHandle: 'alice.1234',
  createdAt: '2026-01-01T00:00:00',
  lastSeen: '2026-03-28T10:00:00',
}

const mockAuthResponse = {
  token: 'jwt-token',
  username: 'alice.1234',
  email: 'alice@example.com',
  userId: 'user-1',
  uniqueHandle: 'alice.1234',
  whoCanMessage: 'APPROVED_ONLY',
}

describe('authStore', () => {
  beforeEach(() => {
    tokenProvider.set(null)
    useAuthStore.setState({
      user: null,
      token: null,
      isInitialized: false,
      isLoading: false,
      error: null,
      pendingVerificationEmail: null,
    })
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('sets token and user on success (email-based)', async () => {
      vi.mocked(authApi.login).mockResolvedValue(mockAuthResponse)
      vi.mocked(authApi.me).mockResolvedValue(mockUser)

      await useAuthStore.getState().login('alice@example.com', 'password123')

      expect(useAuthStore.getState().token).toBe('jwt-token')
      expect(useAuthStore.getState().user?.uniqueHandle).toBe('alice.1234')
      expect(tokenProvider.get()).toBe('jwt-token')
    })

    it('sets error on failure', async () => {
      vi.mocked(authApi.login).mockRejectedValue({
        response: { data: { detail: 'Invalid credentials' } },
      })

      await expect(useAuthStore.getState().login('alice@example.com', 'wrong')).rejects.toBeTruthy()
      expect(useAuthStore.getState().error).toBe('Invalid credentials')
    })

    it('sets isLoading during request', async () => {
      let resolveFn!: () => void
      vi.mocked(authApi.login).mockImplementation(
        () => new Promise((res) => { resolveFn = () => res(mockAuthResponse) })
      )
      vi.mocked(authApi.me).mockResolvedValue(mockUser)

      const loginPromise = useAuthStore.getState().login('alice@example.com', 'pass')
      expect(useAuthStore.getState().isLoading).toBe(true)
      resolveFn()
      await loginPromise
      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('register', () => {
    it('sets pendingVerificationEmail on success (no token yet)', async () => {
      vi.mocked(authApi.register).mockResolvedValue({ message: 'Code sent' })

      await useAuthStore.getState().register('Alice Smith', 'alice@example.com', 'password123')

      expect(useAuthStore.getState().pendingVerificationEmail).toBe('alice@example.com')
      expect(useAuthStore.getState().token).toBeNull()
      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    it('sets error on failure', async () => {
      vi.mocked(authApi.register).mockRejectedValue({
        response: { data: { detail: 'Email already registered' } },
      })

      await expect(
        useAuthStore.getState().register('Alice', 'alice@example.com', 'pass')
      ).rejects.toBeTruthy()
      expect(useAuthStore.getState().error).toBe('Email already registered')
    })
  })

  describe('verifyEmailOtp', () => {
    it('sets token and user on success', async () => {
      vi.mocked(authApi.verifyEmailOtp).mockResolvedValue(mockAuthResponse)
      vi.mocked(authApi.me).mockResolvedValue(mockUser)

      useAuthStore.setState({ pendingVerificationEmail: 'alice@example.com' })

      await useAuthStore.getState().verifyEmailOtp('alice@example.com', '123456')

      expect(useAuthStore.getState().token).toBe('jwt-token')
      expect(useAuthStore.getState().user?.uniqueHandle).toBe('alice.1234')
      expect(useAuthStore.getState().pendingVerificationEmail).toBeNull()
      expect(tokenProvider.get()).toBe('jwt-token')
    })

    it('sets error on wrong OTP', async () => {
      vi.mocked(authApi.verifyEmailOtp).mockRejectedValue({
        response: { data: { detail: 'Invalid verification code' } },
      })

      await expect(
        useAuthStore.getState().verifyEmailOtp('alice@example.com', '000000')
      ).rejects.toBeTruthy()
      expect(useAuthStore.getState().error).toBe('Invalid verification code')
    })
  })

  describe('logout', () => {
    it('clears user, token, pendingVerificationEmail, and in-memory token', () => {
      tokenProvider.set('jwt-token')
      useAuthStore.setState({
        user: mockUser,
        token: 'jwt-token',
        pendingVerificationEmail: 'alice@example.com',
      })

      useAuthStore.getState().logout()

      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().token).toBeNull()
      expect(useAuthStore.getState().pendingVerificationEmail).toBeNull()
      expect(tokenProvider.get()).toBeNull()
    })
  })

  describe('fetchMe', () => {
    it('calls refresh then me, sets user and isInitialized on success', async () => {
      vi.mocked(authApi.refresh).mockResolvedValue(mockAuthResponse)
      vi.mocked(authApi.me).mockResolvedValue(mockUser)

      await useAuthStore.getState().fetchMe()

      expect(authApi.refresh).toHaveBeenCalled()
      expect(authApi.me).toHaveBeenCalled()
      expect(useAuthStore.getState().user?.uniqueHandle).toBe('alice.1234')
      expect(useAuthStore.getState().token).toBe('jwt-token')
      expect(tokenProvider.get()).toBe('jwt-token')
      expect(useAuthStore.getState().isInitialized).toBe(true)
    })

    it('sets isInitialized and clears state on auth failure', async () => {
      vi.mocked(authApi.refresh).mockRejectedValue(new Error('401'))

      await useAuthStore.getState().fetchMe()

      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().token).toBeNull()
      expect(tokenProvider.get()).toBeNull()
      expect(useAuthStore.getState().isInitialized).toBe(true)
    })
  })

  describe('forgotPassword', () => {
    it('returns the server message', async () => {
      vi.mocked(authApi.forgotPassword).mockResolvedValue({
        message: 'If that email is registered, a reset link has been sent.',
      })
      const msg = await useAuthStore.getState().forgotPassword('alice@example.com')
      expect(msg).toContain('reset link')
    })
  })

  describe('resetPassword', () => {
    it('returns the server message', async () => {
      vi.mocked(authApi.resetPassword).mockResolvedValue({
        message: 'Password has been reset successfully.',
      })
      const msg = await useAuthStore.getState().resetPassword('some-token', 'newpass123')
      expect(msg).toContain('reset successfully')
    })
  })
})
