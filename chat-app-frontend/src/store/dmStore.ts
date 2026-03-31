import { create } from 'zustand'
import type { DirectConversation, Message } from '../types'
import { dmApi } from '../api/dm'

interface DMState {
  conversations: DirectConversation[]
  messages: Record<string, Message[]>   // conversationId -> messages
  activeDMId: string | null
  isLoading: boolean
  dmUnreadCounts: Record<string, number>
  fetchConversations: () => Promise<void>
  getOrCreateConversation: (otherUsername: string) => Promise<DirectConversation>
  fetchMessages: (conversationId: string, page?: number) => Promise<void>
  addMessage: (message: Message) => void
  upsertDMMessage: (message: Message) => void
  setActiveDM: (id: string | null) => void
  updateLastMessage: (conversationId: string, timestamp: string) => void
  incrementDMUnread: (conversationId: string) => void
  resetDMUnread: (conversationId: string) => void
}

export const useDMStore = create<DMState>((set, get) => ({
  conversations: [],
  messages: {},
  activeDMId: null,
  isLoading: false,
  dmUnreadCounts: {},

  fetchConversations: async () => {
    const conversations = await dmApi.getConversations()
    set({ conversations })
  },

  getOrCreateConversation: async (otherUsername) => {
    const conv = await dmApi.getOrCreate(otherUsername)
    set((s) => ({
      conversations: s.conversations.some((c) => c.id === conv.id)
        ? s.conversations
        : [conv, ...s.conversations],
    }))
    return conv
  },

  fetchMessages: async (conversationId, page = 0) => {
    set({ isLoading: true })
    const data = await dmApi.getMessages(conversationId, page)
    const ordered = [...data.content].reverse()
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: page === 0 ? ordered : [...ordered, ...(s.messages[conversationId] ?? [])],
      },
      isLoading: false,
    }))
  },

  addMessage: (message) => {
    // DM messages use roomId "dm:{conversationId}" — extract conversationId
    if (!message.roomId.startsWith('dm:')) return
    const conversationId = message.roomId.slice(3)
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [...(s.messages[conversationId] ?? []), message],
      },
    }))
    get().updateLastMessage(conversationId, message.timestamp)
  },

  upsertDMMessage: (message) => {
    if (!message.roomId.startsWith('dm:')) return
    const conversationId = message.roomId.slice(3)
    // Check before set() whether this is a new message or an update to an existing one
    const isNew = !(get().messages[conversationId] ?? []).some((m) => m.id === message.id)
    set((s) => {
      const existing = s.messages[conversationId] ?? []
      const idx = existing.findIndex((m) => m.id === message.id)
      const updated = idx >= 0
        ? existing.map((m, i) => i === idx ? message : m)
        : [...existing, message]
      return { messages: { ...s.messages, [conversationId]: updated } }
    })
    // Only bump lastMessageAt for genuinely new messages — not edits, deletes, or reactions
    if (isNew && !message.edited && !message.deleted) get().updateLastMessage(conversationId, message.timestamp)
  },

  setActiveDM: (id) => set({ activeDMId: id }),

  incrementDMUnread: (conversationId) => {
    set((s) => ({
      dmUnreadCounts: {
        ...s.dmUnreadCounts,
        [conversationId]: (s.dmUnreadCounts[conversationId] ?? 0) + 1,
      },
    }))
  },

  resetDMUnread: (conversationId) => {
    set((s) => {
      if (!s.dmUnreadCounts[conversationId]) return s
      const { [conversationId]: _, ...rest } = s.dmUnreadCounts
      return { dmUnreadCounts: rest }
    })
  },

  updateLastMessage: (conversationId, timestamp) => {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, lastMessageAt: timestamp } : c
      ),
    }))
  },
}))
