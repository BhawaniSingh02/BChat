import client from './client'
import type { DirectConversation, DisappearingTimer, ForwardMessageRequest, Message } from '../types'

export const messagesApi = {
  // ── Phase 19: Starring ───────────────────────────────────────────────

  toggleStar: (messageId: string) =>
    client.post<Message>(`/messages/${messageId}/star`).then((r) => r.data),

  getStarred: () =>
    client.get<Message[]>('/messages/starred').then((r) => r.data),

  // ── Phase 18: Forward ────────────────────────────────────────────────

  forward: (messageId: string, req: ForwardMessageRequest) =>
    client.post<Message>(`/messages/${messageId}/forward`, req).then((r) => r.data),

  // ── Phase 22: Read receipts ──────────────────────────────────────────

  getReadReceipts: (messageId: string) =>
    client.get<Record<string, string>>(`/messages/${messageId}/read-receipts`).then((r) => r.data),

  // ── Phase 20: DM Mute ────────────────────────────────────────────────

  muteDM: (conversationId: string, duration = 'ALWAYS') =>
    client.post<DirectConversation>(`/dm/${conversationId}/mute`, { duration }).then((r) => r.data),

  unmuteDM: (conversationId: string) =>
    client.delete<DirectConversation>(`/dm/${conversationId}/mute`).then((r) => r.data),

  // ── Phase 20: DM Archive ─────────────────────────────────────────────

  archiveDM: (conversationId: string) =>
    client.post<DirectConversation>(`/dm/${conversationId}/archive`).then((r) => r.data),

  unarchiveDM: (conversationId: string) =>
    client.delete<DirectConversation>(`/dm/${conversationId}/archive`).then((r) => r.data),

  // ── Phase 21: Disappearing timer ─────────────────────────────────────

  setDisappearingTimer: (conversationId: string, timer: DisappearingTimer) =>
    client.patch<DirectConversation>(`/dm/${conversationId}/disappearing`, { timer }).then((r) => r.data),

  // ── Phase 20: Room Mute ──────────────────────────────────────────────

  muteRoom: (roomId: string, duration = 'ALWAYS') =>
    client.post(`/rooms/${roomId}/mute`, { duration }).then((r) => r.data),

  unmuteRoom: (roomId: string) =>
    client.delete(`/rooms/${roomId}/mute`).then((r) => r.data),

  // ── Phase 20: Room Archive ───────────────────────────────────────────

  archiveRoom: (roomId: string) =>
    client.post(`/rooms/${roomId}/archive`).then((r) => r.data),

  unarchiveRoom: (roomId: string) =>
    client.delete(`/rooms/${roomId}/archive`).then((r) => r.data),

  // ── Phase 23: User Blocking ──────────────────────────────────────────

  blockUser: (username: string) =>
    client.post(`/users/${username}/block`).then((r) => r.data),

  unblockUser: (username: string) =>
    client.delete(`/users/${username}/block`).then((r) => r.data),

  getBlockedUsers: () =>
    client.get('/users/me/blocked').then((r) => r.data),
}
