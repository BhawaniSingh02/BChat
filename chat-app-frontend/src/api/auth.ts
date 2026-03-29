import client from './client'
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../types'

export const authApi = {
  register: (data: RegisterRequest) =>
    client.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  login: (data: LoginRequest) =>
    client.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  me: () => client.get<User>('/auth/me').then((r) => r.data),
}
