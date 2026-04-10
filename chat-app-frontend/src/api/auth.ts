import client from './client'
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../types'

export const authApi = {
  /** Phase 2: Create a pending user and trigger OTP email. Returns {message}. */
  register: (data: RegisterRequest) =>
    client.post<{ message: string }>('/auth/register', data).then((r) => r.data),

  /** Phase 3: Login by email + password. */
  login: (data: LoginRequest) =>
    client.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  /** Phase 2: Verify the 6-digit OTP and activate the account. Returns JWT. */
  verifyEmailOtp: (email: string, code: string) =>
    client.post<AuthResponse>('/auth/verify-email', { email, code }).then((r) => r.data),

  /** Phase 2: Resend OTP to email. Always returns 200. */
  resendVerification: (email: string) =>
    client.post<{ message: string }>('/auth/resend-verification', { email }).then((r) => r.data),

  /** Exchange the httpOnly refresh cookie for a fresh access token. */
  refresh: () =>
    client.post<AuthResponse>('/auth/refresh').then((r) => r.data),

  me: () => client.get<User>('/auth/me').then((r) => r.data),

  forgotPassword: (email: string) =>
    client.post<{ message: string }>('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (token: string, newPassword: string) =>
    client.post<{ message: string }>('/auth/reset-password', { token, newPassword }).then((r) => r.data),

  /** Legacy link-based verification (GET). */
  verifyEmailLink: (token: string) =>
    client.get<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`).then((r) => r.data),
}
