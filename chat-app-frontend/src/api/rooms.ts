import client from './client'
import type { CreateRoomRequest, Message, PagedResponse, Room, UpdateRoomRequest, User } from '../types'

export const roomsApi = {
  getAll: () => client.get<Room[]>('/rooms').then((r) => r.data),

  getMine: () => client.get<Room[]>('/rooms/me').then((r) => r.data),

  get: (roomId: string) => client.get<Room>(`/rooms/${roomId}`).then((r) => r.data),

  create: (data: CreateRoomRequest) =>
    client.post<Room>('/rooms', data).then((r) => r.data),

  join: (roomId: string) =>
    client.post<Room>(`/rooms/${roomId}/join`).then((r) => r.data),

  leave: (roomId: string) =>
    client.delete(`/rooms/${roomId}/leave`),

  getMessages: (roomId: string, page = 0, size = 50) =>
    client
      .get<PagedResponse<Message>>(`/rooms/${roomId}/messages`, { params: { page, size } })
      .then((r) => r.data),

  searchMessages: (roomId: string, q: string) =>
    client
      .get<Message[]>(`/rooms/${roomId}/messages/search`, { params: { q } })
      .then((r) => r.data),

  markRead: (roomId: string, messageId: string) =>
    client.post<Message>(`/rooms/${roomId}/messages/${messageId}/read`).then((r) => r.data),

  editMessage: (roomId: string, messageId: string, content: string) =>
    client.put<Message>(`/rooms/${roomId}/messages/${messageId}`, { content }).then((r) => r.data),

  deleteMessage: (roomId: string, messageId: string) =>
    client.delete<Message>(`/rooms/${roomId}/messages/${messageId}`).then((r) => r.data),

  getMembers: (roomId: string) =>
    client.get<User[]>(`/rooms/${roomId}/members`).then((r) => r.data),

  kickMember: (roomId: string, username: string) =>
    client.delete<Room>(`/rooms/${roomId}/members/${username}`).then((r) => r.data),

  updateRoom: (roomId: string, data: UpdateRoomRequest) =>
    client.patch<Room>(`/rooms/${roomId}`, data).then((r) => r.data),

  pinMessage: (roomId: string, messageId: string) =>
    client.post<Room>(`/rooms/${roomId}/pin/${messageId}`).then((r) => r.data),

  unpinMessage: (roomId: string, messageId: string) =>
    client.delete<Room>(`/rooms/${roomId}/pin/${messageId}`).then((r) => r.data),
}
