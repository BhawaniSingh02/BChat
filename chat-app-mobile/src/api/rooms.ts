import apiClient from './client';
import { CursorPage, Message, Room, UserSummary } from '../types';

export const roomsApi = {
  getMine: () => apiClient.get<Room[]>('/rooms/me').then((r) => r.data),

  getMessages: (roomId: string, before?: number, size = 50) =>
    apiClient
      .get<CursorPage<Message>>(`/rooms/${roomId}/messages`, { params: { before, size } })
      .then((r) => r.data),

  /** Pin a message in a room (max 3 per room, any member may pin). Returns the updated room. */
  pinMessage: (roomId: string, messageId: string) =>
    apiClient.post<Room>(`/rooms/${roomId}/pin/${messageId}`).then((r) => r.data),

  unpinMessage: (roomId: string, messageId: string) =>
    apiClient.delete<Room>(`/rooms/${roomId}/pin/${messageId}`).then((r) => r.data),

  getMembers: (roomId: string) => apiClient.get<UserSummary[]>(`/rooms/${roomId}/members`).then((r) => r.data),

  /** Kick a member — creator/admin only, and cannot kick self. Returns the updated room. */
  kickMember: (roomId: string, username: string) =>
    apiClient.delete<Room>(`/rooms/${roomId}/members/${username}`).then((r) => r.data),

  /** Edit group name/description — creator/admin only. Returns the updated room. */
  updateRoom: (roomId: string, data: { name?: string; description?: string }) =>
    apiClient.patch<Room>(`/rooms/${roomId}`, data).then((r) => r.data),

  leave: (roomId: string) => apiClient.delete(`/rooms/${roomId}/leave`).then(() => undefined),

  create: (data: { roomId: string; name: string; description?: string }) =>
    apiClient.post<Room>('/rooms', data).then((r) => r.data),

  getUnreadCounts: () => apiClient.get<Record<string, number>>('/rooms/me/unread-counts').then((r) => r.data),

  mute: (roomId: string, duration: '8H' | '1W' | 'ALWAYS' = 'ALWAYS') =>
    apiClient.post(`/rooms/${roomId}/mute`, { duration }),

  unmute: (roomId: string) => apiClient.delete(`/rooms/${roomId}/mute`),
};
