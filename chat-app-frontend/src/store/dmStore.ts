import { create } from 'zustand'
import type { DirectConversation, Message } from '../types'
import { dmApi } from '../api/dm'
import { previewForMessage } from '../utils/conversation'

interface DMState {
  conversations: DirectConversation[]
  messages: Record<string, Message[]>   // conversationId -> messages
  activeDMId: string | null
  isLoading: boolean
  dmUnreadCounts: Record<string, number>
  /** Cursor to fetch the next (older) page of messages for a conversation, or null if no more. */
  nextCursor: Record<string, number | null>
  hasMoreOlder: Record<string, boolean>
  isLoadingOlder: Record<string, boolean>
  fetchConversations: () => Promise<void>
  getOrCreateConversation: (otherUsername: string) => Promise<DirectConversation>
  fetchMessages: (conversationId: string) => Promise<void>
  loadMoreMessages: (conversationId: string) => Promise<void>
  addMessage: (message: Message) => void
  upsertDMMessage: (message: Message) => void
  setActiveDM: (id: string | null) => void
  updateLastMessage: (conversationId: string, message: Message) => void
  incrementDMUnread: (conversationId: string) => void
  resetDMUnread: (conversationId: string) => void
  removeConversation: (conversationId: string) => void
  updateConversation: (updated: DirectConversation) => void
  // Message requests
  requests: DirectConversation[]
  fetchRequests: () => Promise<void>
  acceptRequest: (conversationId: string) => Promise<void>
  declineRequest: (conversationId: string) => Promise<void>
}

export const useDMStore = create<DMState>((set, get) => ({
  conversations: [],
  messages: {},
  activeDMId: null,
  isLoading: false,
  dmUnreadCounts: {},
  nextCursor: {},
  hasMoreOlder: {},
  isLoadingOlder: {},
  requests: [],

  fetchConversations: async () => {
    const conversations = await dmApi.getConversations()
    set({ conversations })
  },

  fetchRequests: async () => {
    try {
      const requests = await dmApi.getRequests()
      set({ requests })
    } catch { /* requests are optional — ignore failures */ }
  },

  acceptRequest: async (conversationId) => {
    const accepted = await dmApi.acceptRequest(conversationId)
    set((s) => ({
      requests: s.requests.filter((r) => r.id !== conversationId),
      conversations: s.conversations.some((c) => c.id === accepted.id)
        ? s.conversations.map((c) => (c.id === accepted.id ? accepted : c))
        : [accepted, ...s.conversations],
    }))
  },

  declineRequest: async (conversationId) => {
    await dmApi.declineRequest(conversationId)
    set((s) => ({ requests: s.requests.filter((r) => r.id !== conversationId) }))
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

  fetchMessages: async (conversationId) => {
    set({ isLoading: true })
    const data = await dmApi.getMessages(conversationId)
    const ordered = [...data.content].reverse()
    set((s) => ({
      messages: { ...s.messages, [conversationId]: ordered },
      nextCursor: { ...s.nextCursor, [conversationId]: data.nextCursor },
      hasMoreOlder: { ...s.hasMoreOlder, [conversationId]: data.hasMore },
      isLoading: false,
    }))
  },

  loadMoreMessages: async (conversationId) => {
    const cursor = get().nextCursor[conversationId]
    if (!cursor || get().isLoadingOlder[conversationId]) return
    set((s) => ({ isLoadingOlder: { ...s.isLoadingOlder, [conversationId]: true } }))
    const data = await dmApi.getMessages(conversationId, cursor)
    const older = [...data.content].reverse()
    set((s) => ({
      messages: { ...s.messages, [conversationId]: [...older, ...(s.messages[conversationId] ?? [])] },
      nextCursor: { ...s.nextCursor, [conversationId]: data.nextCursor },
      hasMoreOlder: { ...s.hasMoreOlder, [conversationId]: data.hasMore },
      isLoadingOlder: { ...s.isLoadingOlder, [conversationId]: false },
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
    get().updateLastMessage(conversationId, message)
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
    if (isNew && !message.edited && !message.deleted) get().updateLastMessage(conversationId, message)
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

  updateLastMessage: (conversationId, message) => {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessageAt: message.timestamp,
              lastMessagePreview: previewForMessage(message),
              lastMessageType: message.messageType,
              lastMessageSender: message.sender,
            }
          : c
      ),
    }))
  },

  removeConversation: (conversationId) => {
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== conversationId),
      activeDMId: s.activeDMId === conversationId ? null : s.activeDMId,
    }))
  },

  // Replace a conversation in place after a settings change (mute, archive,
  // disappearing timer). Keeps the sidebar and chat view in sync immediately.
  updateConversation: (updated) => {
    set((s) => ({
      conversations: s.conversations.map((c) => (c.id === updated.id ? updated : c)),
    }))
  },
}))
