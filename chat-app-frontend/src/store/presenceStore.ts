import { create } from 'zustand'
import type { PresenceEvent } from '../types'
import { presenceApi } from '../api/presence'

interface PresenceState {
  onlineUsers: Set<string>
  fetchOnlineUsers: () => Promise<void>
  applyEvent: (event: PresenceEvent) => void
  isOnline: (username: string) => boolean
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUsers: new Set(),

  fetchOnlineUsers: async () => {
    const users = await presenceApi.getOnlineUsers()
    set({ onlineUsers: new Set(users) })
  },

  applyEvent: (event) => {
    set((s) => {
      const updated = new Set(s.onlineUsers)
      if (event.online) updated.add(event.username)
      else updated.delete(event.username)
      return { onlineUsers: updated }
    })
  },

  isOnline: (username) => get().onlineUsers.has(username),
}))
