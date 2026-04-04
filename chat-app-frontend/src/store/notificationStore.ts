import { create } from 'zustand'
import type { Message } from '../types'
import type { NotificationItem } from '../components/ui/NotificationBell'

interface NotificationState {
  notifications: NotificationItem[]

  addNotification: (message: Message, conversationLabel: string) => void
  markAllRead: () => void
  markRead: (id: string) => void
  clearNotifications: () => void
  unreadCount: () => number
}

let idCounter = 0

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  addNotification: (message, conversationLabel) => {
    idCounter++
    const item: NotificationItem = {
      id: `notif-${idCounter}`,
      message,
      conversationLabel,
      read: false,
      at: message.timestamp ?? new Date().toISOString(),
    }
    set((s) => ({
      notifications: [item, ...s.notifications].slice(0, 50), // keep latest 50
    }))
  },

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),

  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
    })),

  clearNotifications: () => set({ notifications: [] }),

  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}))
