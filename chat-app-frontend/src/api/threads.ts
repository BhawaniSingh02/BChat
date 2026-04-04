import client from './client'
import type { Message } from '../types'

export const threadsApi = {
  // Phase 27 — Message threads
  getThreadReplies: (messageId: string) =>
    client.get<Message[]>(`/threads/${messageId}`).then((r) => r.data),
}
