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
  fetchMessages: (roomId: string, page?: number) => Promise<void>
  addMessage: (message: Message) => void
  upsertMessage: (message: Message) => void
  setTyping: (roomId: string, username: string, typing: boolean) => void
  updateReadBy: (message: Message) => void
  clearRoom: (roomId: string) => void
  incrementUnread: (roomId: string) => void
  resetUnread: (roomId: string) => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: {},
  typingUsers: {},
  isLoadingMessages: false,
  unreadCounts: {},

  fetchMessages: async (roomId, page = 0) => {
    set({ isLoadingMessages: true })
    const data = await roomsApi.getMessages(roomId, page)
    // API returns newest first; reverse to show oldest first
    const ordered = [...data.content].reverse()
    set((s) => ({
      messages: {
        ...s.messages,
        [roomId]: page === 0 ? ordered : [...ordered, ...(s.messages[roomId] ?? [])],
      },
      isLoadingMessages: false,
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
      const updated = idx >= 0
        ? existing.map((m, i) => (i === idx ? message : m))
        : [...existing, message]
      return { messages: { ...s.messages, [message.roomId]: updated } }
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
      const { [roomId]: _, ...rest } = s.messages
      return { messages: rest }
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
