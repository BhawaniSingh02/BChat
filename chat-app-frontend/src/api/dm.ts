import client from './client'
import type { DirectConversation, Message, PagedResponse } from '../types'

export const dmApi = {
  getConversations: () =>
    client.get<DirectConversation[]>('/dm').then((r) => r.data),

  getOrCreate: (otherUsername: string) =>
    client.post<DirectConversation>(`/dm/${otherUsername}`).then((r) => r.data),

  getMessages: (conversationId: string, page = 0, size = 50) =>
    client
      .get<PagedResponse<Message>>(`/dm/${conversationId}/messages`, { params: { page, size } })
      .then((r) => r.data),

  sendMessage: (conversationId: string, content: string) =>
    client
      .post<Message>(`/dm/${conversationId}/messages`, { content })
      .then((r) => r.data),
}
