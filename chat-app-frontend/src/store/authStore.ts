import { create } from 'zustand'
import type { User, UpdateProfileRequest, ChangePasswordRequest } from '../types'
import { authApi } from '../api/auth'
import { usersApi } from '../api/users'
import { useUserCacheStore } from './userCacheStore'
import { tokenProvider } from '../api/tokenProvider'

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
  isInitialized: boolean
  isLoading: boolean
  error: string | null
  /** Email waiting for OTP verification after registration. */
  pendingVerificationEmail: string | null

  login: (email: string, password: string) => Promise<void>
  register: (displayName: string, email: string, password: string) => Promise<void>
  verifyEmailOtp: (email: string, code: string) => Promise<void>
  resendVerification: (email: string) => Promise<string>
  clearError: () => void
  logout: () => void
  fetchMe: () => Promise<void>
  forgotPassword: (email: string) => Promise<string>
  resetPassword: (token: string, newPassword: string) => Promise<string>
  updateProfile: (data: UpdateProfileRequest) => Promise<void>
  uploadAvatar: (file: File) => Promise<void>
  removeAvatar: () => Promise<void>
  changePassword: (data: ChangePasswordRequest) => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isInitialized: false,
  isLoading: false,
  error: null,
  pendingVerificationEmail: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const data = await authApi.login({ email, password })
      tokenProvider.set(data.token)
      set({ token: data.token, isLoading: false })
      const user = await authApi.me()
      set({ user })
      useUserCacheStore.getState().seed(user)
    } catch (err: unknown) {
      set({ error: extractErrorMessage(err, 'Login failed'), isLoading: false })
      throw err
    }
  },

  /**
   * Phase 2: Creates a pending user and sends OTP.
   * Does NOT log in — sets pendingVerificationEmail so the UI shows the OTP step.
   */
  register: async (displayName, email, password) => {
    set({ isLoading: true, error: null })
    try {
      await authApi.register({ displayName, email, password })
      set({ pendingVerificationEmail: email, isLoading: false })
    } catch (err: unknown) {
      set({ error: extractErrorMessage(err, 'Registration failed'), isLoading: false })
      throw err
    }
  },

  /**
   * Phase 2: Verify OTP, activate account, and log in.
   */
  verifyEmailOtp: async (email, code) => {
    set({ isLoading: true, error: null })
    try {
      const data = await authApi.verifyEmailOtp(email, code)
      tokenProvider.set(data.token)
      set({ token: data.token, pendingVerificationEmail: null, isLoading: false })
      const user = await authApi.me()
      set({ user })
      useUserCacheStore.getState().seed(user)
    } catch (err: unknown) {
      set({ error: extractErrorMessage(err, 'Verification failed'), isLoading: false })
      throw err
    }
  },

  resendVerification: async (email) => {
    const data = await authApi.resendVerification(email)
    return data.message
  },

  clearError: () => set({ error: null }),

  logout: () => {
    tokenProvider.set(null)
    set({ user: null, token: null, pendingVerificationEmail: null })
  },

  /**
   * Called on app load. Uses the httpOnly refresh cookie to get a fresh
   * access token (needed for WebSocket auth), then fetches the user profile.
   * Sets isInitialized=true regardless of outcome so RequireAuth can render.
   */
  fetchMe: async () => {
    try {
      const refreshData = await authApi.refresh()
      tokenProvider.set(refreshData.token)
      set({ token: refreshData.token })
      const user = await authApi.me()
      set({ user, isInitialized: true })
      useUserCacheStore.getState().seed(user)
    } catch {
      tokenProvider.set(null)
      set({ user: null, token: null, isInitialized: true })
    }
  },

  forgotPassword: async (email) => {
    const data = await authApi.forgotPassword(email)
    return data.message
  },

  resetPassword: async (token, newPassword) => {
    const data = await authApi.resetPassword(token, newPassword)
    return data.message
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
