import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../api/auth'

vi.mock('../../api/auth')

const mockUser = {
  id: 'user-1',
  username: 'alice',
  email: 'alice@example.com',
  createdAt: '2026-01-01T00:00:00',
  lastSeen: '2026-03-28T10:00:00',
}

const mockAuthResponse = {
  token: 'jwt-token',
  username: 'alice',
  email: 'alice@example.com',
  userId: 'user-1',
}

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ user: null, token: null, isLoading: false, error: null })
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('sets token and user on success', async () => {
      vi.mocked(authApi.login).mockResolvedValue(mockAuthResponse)
      vi.mocked(authApi.me).mockResolvedValue(mockUser)

      await useAuthStore.getState().login('alice', 'password123')

      expect(useAuthStore.getState().token).toBe('jwt-token')
      expect(useAuthStore.getState().user?.username).toBe('alice')
      expect(localStorage.getItem('token')).toBe('jwt-token')
    })

    it('sets error on failure', async () => {
      vi.mocked(authApi.login).mockRejectedValue({
        response: { data: { detail: 'Invalid credentials' } },
      })

      await expect(useAuthStore.getState().login('alice', 'wrong')).rejects.toBeTruthy()
      expect(useAuthStore.getState().error).toBe('Invalid credentials')
    })

    it('sets isLoading during request', async () => {
      let resolveFn!: () => void
      vi.mocked(authApi.login).mockImplementation(
        () => new Promise((res) => { resolveFn = () => res(mockAuthResponse) })
      )
      vi.mocked(authApi.me).mockResolvedValue(mockUser)

      const loginPromise = useAuthStore.getState().login('alice', 'pass')
      expect(useAuthStore.getState().isLoading).toBe(true)
      resolveFn()
      await loginPromise
      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('register', () => {
    it('sets token and user on success', async () => {
      vi.mocked(authApi.register).mockResolvedValue(mockAuthResponse)
      vi.mocked(authApi.me).mockResolvedValue(mockUser)

      await useAuthStore.getState().register('alice', 'alice@example.com', 'password123')

      expect(useAuthStore.getState().token).toBe('jwt-token')
      expect(useAuthStore.getState().user?.email).toBe('alice@example.com')
    })

    it('sets error on failure', async () => {
      vi.mocked(authApi.register).mockRejectedValue({
        response: { data: { detail: 'Username taken' } },
      })

      await expect(useAuthStore.getState().register('alice', 'alice@example.com', 'pass')).rejects.toBeTruthy()
      expect(useAuthStore.getState().error).toBe('Username taken')
    })
  })

  describe('logout', () => {
    it('clears user, token, and localStorage', () => {
      localStorage.setItem('token', 'jwt-token')
      useAuthStore.setState({ user: mockUser, token: 'jwt-token' })

      useAuthStore.getState().logout()

      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().token).toBeNull()
      expect(localStorage.getItem('token')).toBeNull()
    })
  })

  describe('fetchMe', () => {
    it('fetches user when token exists', async () => {
      localStorage.setItem('token', 'jwt-token')
      vi.mocked(authApi.me).mockResolvedValue(mockUser)

      await useAuthStore.getState().fetchMe()

      expect(useAuthStore.getState().user?.username).toBe('alice')
    })

    it('does nothing when no token', async () => {
      await useAuthStore.getState().fetchMe()
      expect(authApi.me).not.toHaveBeenCalled()
    })

    it('clears token on auth failure', async () => {
      localStorage.setItem('token', 'expired-token')
      vi.mocked(authApi.me).mockRejectedValue(new Error('401'))

      await useAuthStore.getState().fetchMe()

      expect(useAuthStore.getState().token).toBeNull()
      expect(localStorage.getItem('token')).toBeNull()
    })
  })
})
