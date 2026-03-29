import client from './client'

export const presenceApi = {
  getOnlineUsers: () =>
    client.get<string[]>('/presence').then((r) => r.data),

  getUserPresence: (username: string) =>
    client.get<{ username: string; online: boolean }>(`/presence/${username}`).then((r) => r.data),
}
