import apiClient from './client';
import { CursorPage, DirectConversation, Message } from '../types';

export const dmApi = {
  getConversations: () => apiClient.get<DirectConversation[]>('/dm').then((r) => r.data),

  getRequests: () => apiClient.get<DirectConversation[]>('/dm/requests').then((r) => r.data),

  getOrCreate: (otherUsername: string) =>
    apiClient.post<DirectConversation>(`/dm/${otherUsername}`).then((r) => r.data),

  getMessages: (conversationId: string, before?: number, size = 50) =>
    apiClient
      .get<CursorPage<Message>>(`/dm/${conversationId}/messages`, { params: { before, size } })
      .then((r) => r.data),

  acceptRequest: (conversationId: string) =>
    apiClient.post<DirectConversation>(`/dm/${conversationId}/accept`).then((r) => r.data),

  declineRequest: (conversationId: string) => apiClient.post(`/dm/${conversationId}/decline`),

  // "Delete chat" in the UI maps to archive — same semantics as WhatsApp's delete:
  // hides it from your own list without deleting anything for the other participant.
  archive: (conversationId: string) =>
    apiClient.post<DirectConversation>(`/dm/${conversationId}/archive`).then((r) => r.data),

  getUnreadCounts: () => apiClient.get<Record<string, number>>('/dm/unread-counts').then((r) => r.data),

  mute: (conversationId: string, duration: '8H' | '1W' | 'ALWAYS' = 'ALWAYS') =>
    apiClient.post<DirectConversation>(`/dm/${conversationId}/mute`, { duration }).then((r) => r.data),

  unmute: (conversationId: string) =>
    apiClient.delete<DirectConversation>(`/dm/${conversationId}/mute`).then((r) => r.data),
};
