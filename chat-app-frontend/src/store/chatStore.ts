import { create } from 'zustand'
import type { Message } from '../types'
import { roomsApi } from '../api/rooms'

interface TypingUsers {
  [roomId: string]: string[]
}

interface ChatState {
  messages: Record<string, Message[]>  // roomId -> messages
  typingUsers: TypingUsers
  isLoadingMessages: boolean
  unreadCounts: Record<string, number>
  /** Cursor to fetch the next (older) page of messages for a room, or null if no more. */
  nextCursor: Record<string, number | null>
  hasMoreOlder: Record<string, boolean>
  isLoadingOlder: Record<string, boolean>
  fetchMessages: (roomId: string) => Promise<void>
  loadMoreMessages: (roomId: string) => Promise<void>
  addMessage: (message: Message) => void
  upsertMessage: (message: Message) => void
  markMessageFailed: (roomId: string, id: string) => void
  setTyping: (roomId: string, username: string, typing: boolean) => void
  updateReadBy: (message: Message) => void
  clearRoom: (roomId: string) => void
  incrementUnread: (roomId: string) => void
  resetUnread: (roomId: string) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},
  typingUsers: {},
  isLoadingMessages: false,
  unreadCounts: {},
  nextCursor: {},
  hasMoreOlder: {},
  isLoadingOlder: {},

  fetchMessages: async (roomId) => {
    set({ isLoadingMessages: true })
    const data = await roomsApi.getMessages(roomId)
    // API returns newest first; reverse to show oldest first
    const ordered = [...data.content].reverse()
    set((s) => ({
      messages: { ...s.messages, [roomId]: ordered },
      nextCursor: { ...s.nextCursor, [roomId]: data.nextCursor },
      hasMoreOlder: { ...s.hasMoreOlder, [roomId]: data.hasMore },
      isLoadingMessages: false,
    }))
  },

  loadMoreMessages: async (roomId) => {
    const cursor = get().nextCursor[roomId]
    if (!cursor || get().isLoadingOlder[roomId]) return
    set((s) => ({ isLoadingOlder: { ...s.isLoadingOlder, [roomId]: true } }))
    const data = await roomsApi.getMessages(roomId, cursor)
    const older = [...data.content].reverse()
    set((s) => ({
      messages: { ...s.messages, [roomId]: [...older, ...(s.messages[roomId] ?? [])] },
      nextCursor: { ...s.nextCursor, [roomId]: data.nextCursor },
      hasMoreOlder: { ...s.hasMoreOlder, [roomId]: data.hasMore },
      isLoadingOlder: { ...s.isLoadingOlder, [roomId]: false },
    }))
  },

  addMessage: (message) => {
    set((s) => ({
      messages: {
        ...s.messages,
        [message.roomId]: [...(s.messages[message.roomId] ?? []), message],
      },
    }))
  },

  // Replace existing message by ID if present, otherwise append (handles edits/deletes from WS)
  upsertMessage: (message) => {
    set((s) => {
      const existing = s.messages[message.roomId] ?? []
      const idx = existing.findIndex((m) => m.id === message.id)
      if (idx >= 0) {
        return { messages: { ...s.messages, [message.roomId]: existing.map((m, i) => (i === idx ? message : m)) } }
      }
      // Reconcile with our own optimistic (pending) copy of this message, if one is still sitting there
      const pendingIdx = existing.findIndex((m) =>
        m.pending && m.sender === message.sender && m.content === message.content
        && m.fileUrl === message.fileUrl && m.messageType === message.messageType
      )
      const updated = pendingIdx >= 0
        ? existing.map((m, i) => (i === pendingIdx ? message : m))
        : [...existing, message]
      return { messages: { ...s.messages, [message.roomId]: updated } }
    })
  },

  // Flip a still-pending optimistic message to failed (e.g. it never got a server echo)
  markMessageFailed: (roomId, id) => {
    set((s) => {
      const existing = s.messages[roomId] ?? []
      const idx = existing.findIndex((m) => m.id === id && m.pending)
      if (idx < 0) return s
      return {
        messages: {
          ...s.messages,
          [roomId]: existing.map((m, i) => (i === idx ? { ...m, pending: false, failed: true } : m)),
        },
      }
    })
  },

  setTyping: (roomId, username, typing) => {
    set((s) => {
      const current = s.typingUsers[roomId] ?? []
      const updated = typing
        ? current.includes(username) ? current : [...current, username]
        : current.filter((u) => u !== username)
      return { typingUsers: { ...s.typingUsers, [roomId]: updated } }
    })
  },

  updateReadBy: (message) => {
    set((s) => {
      const roomMessages = s.messages[message.roomId] ?? []
      return {
        messages: {
          ...s.messages,
          [message.roomId]: roomMessages.map((m) =>
            m.id === message.id ? message : m
          ),
        },
      }
    })
  },

  clearRoom: (roomId) => {
    set((s) => {
      const { [roomId]: _m, ...messages } = s.messages
      const { [roomId]: _c, ...nextCursor } = s.nextCursor
      const { [roomId]: _h, ...hasMoreOlder } = s.hasMoreOlder
      return { messages, nextCursor, hasMoreOlder }
    })
  },

  incrementUnread: (roomId) => {
    set((s) => ({
      unreadCounts: {
        ...s.unreadCounts,
        [roomId]: (s.unreadCounts[roomId] ?? 0) + 1,
      },
    }))
  },

  resetUnread: (roomId) => {
    set((s) => {
      if (!s.unreadCounts[roomId]) return s
      const { [roomId]: _, ...rest } = s.unreadCounts
      return { unreadCounts: rest }
    })
  },
}))
