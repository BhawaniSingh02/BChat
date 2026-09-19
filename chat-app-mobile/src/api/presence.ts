import apiClient from './client';

export const presenceApi = {
  getOnlineUsers: () => apiClient.get<string[]>('/presence').then((r) => r.data),
};
