import apiClient from './client';
import { UserSummary } from '../types';

export const usersApi = {
  search: (q: string) => apiClient.get<UserSummary[]>('/users/search', { params: { q } }).then((r) => r.data),
  getByUsername: (username: string) => apiClient.get<UserSummary>(`/users/${username}`).then((r) => r.data),
  checkHandle: (handle: string) =>
    apiClient
      .get<{ available: boolean; reason?: string }>('/users/handle-available', { params: { handle } })
      .then((r) => r.data),
};
