import { create } from 'zustand'
import type { User, UpdateProfileRequest, ChangePasswordRequest } from '../types'
import { authApi } from '../api/auth'
import { usersApi } from '../api/users'
import { useUserCacheStore } from './userCacheStore'

interface ApiError {
  response?: { data?: { detail?: string; message?: string } }
}

function extractErrorMessage(err: unknown, fallback: string): string {
  const e = err as ApiError
  return e?.response?.data?.detail ?? e?.response?.data?.message ?? fallback
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
  updateProfile: (data: UpdateProfileRequest) => Promise<void>
  uploadAvatar: (file: File) => Promise<void>
  removeAvatar: () => Promise<void>
  changePassword: (data: ChangePasswordRequest) => Promise<void>
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
      const user = await authApi.me()
      set({ user })
      useUserCacheStore.getState().seed(user)
    } catch (err: unknown) {
      set({ error: extractErrorMessage(err, 'Login failed'), isLoading: false })
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
      useUserCacheStore.getState().seed(user)
    } catch (err: unknown) {
      set({ error: extractErrorMessage(err, 'Registration failed'), isLoading: false })
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
      useUserCacheStore.getState().seed(user)
    } catch {
      localStorage.removeItem('token')
      set({ user: null, token: null })
    }
  },

  updateProfile: async (data) => {
    const updated = await usersApi.updateProfile(data)
    set({ user: updated })
    useUserCacheStore.getState().seed(updated)
  },

  uploadAvatar: async (file) => {
    const updated = await usersApi.uploadAvatar(file)
    set({ user: updated })
    useUserCacheStore.getState().seed(updated)
  },

  removeAvatar: async () => {
    const updated = await usersApi.removeAvatar()
    set({ user: updated })
    useUserCacheStore.getState().seed(updated)
  },

  changePassword: async (data) => {
    await usersApi.changePassword(data)
  },
}))
