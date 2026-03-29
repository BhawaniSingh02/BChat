import client from './client'
import type { User, UpdateProfileRequest } from '../types'

export const usersApi = {
  search: (q: string) =>
    client.get<User[]>('/users/search', { params: { q } }).then((r) => r.data),

  get: (username: string) =>
    client.get<User>(`/users/${username}`).then((r) => r.data),

  updateProfile: (data: UpdateProfileRequest) =>
    client.patch<User>('/users/profile', data).then((r) => r.data),
}
