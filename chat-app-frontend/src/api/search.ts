import client from './client'
import type { Message } from '../types'

export const searchApi = {
  // Phase 25 — Global message search
  searchMessages: (q: string, limit = 20) =>
    client.get<Message[]>('/search/messages', { params: { q, limit } }).then((r) => r.data),
}
