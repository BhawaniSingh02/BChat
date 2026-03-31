import client from './client'
import type { User, UpdateProfileRequest, ChangePasswordRequest } from '../types'

export const usersApi = {
  getMe: () =>
    client.get<User>('/users/me').then((r) => r.data),

  search: (q: string) =>
    client.get<User[]>('/users/search', { params: { q } }).then((r) => r.data),

  get: (username: string) =>
    client.get<User>(`/users/${username}`).then((r) => r.data),

  updateProfile: (data: UpdateProfileRequest) =>
    client.patch<User>('/users/me', data).then((r) => r.data),

  uploadAvatar: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return client
      .post<User>('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  removeAvatar: () =>
    client.delete<User>('/users/me/avatar').then((r) => r.data),

  changePassword: (data: ChangePasswordRequest) =>
    client.put<{ message: string }>('/users/me/password', data).then((r) => r.data),
}
