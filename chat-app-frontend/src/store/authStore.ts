import { create } from 'zustand'
import type { User } from '../types'
import { authApi } from '../api/auth'
import { usersApi } from '../api/users'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
  updateProfile: (data: import('../types').UpdateProfileRequest) => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null })
    try {
      const data = await authApi.login({ username, password })
      localStorage.setItem('token', data.token)
      set({ token: data.token, isLoading: false })
      // fetch full user profile
      const user = await authApi.me()
      set({ user })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Login failed'
      set({ error: msg, isLoading: false })
      throw err
    }
  },

  register: async (username, email, password) => {
    set({ isLoading: true, error: null })
    try {
      const data = await authApi.register({ username, email, password })
      localStorage.setItem('token', data.token)
      set({ token: data.token, isLoading: false })
      const user = await authApi.me()
      set({ user })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Registration failed'
      set({ error: msg, isLoading: false })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },

  fetchMe: async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const user = await authApi.me()
      set({ user, token })
    } catch {
      localStorage.removeItem('token')
      set({ user: null, token: null })
    }
  },

  updateProfile: async (data) => {
    const updated = await usersApi.updateProfile(data)
    set({ user: updated })
  },
}))
