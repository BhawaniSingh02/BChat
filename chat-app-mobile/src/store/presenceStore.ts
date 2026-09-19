import { create } from 'zustand';
import { presenceApi } from '../api/presence';
import { PresenceEvent } from '../types';

interface PresenceState {
  onlineUsers: Set<string>;
  fetchOnlineUsers: () => Promise<void>;
  applyEvent: (event: PresenceEvent) => void;
  isOnline: (username: string) => boolean;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUsers: new Set(),

  fetchOnlineUsers: async () => {
    try {
      const usernames = await presenceApi.getOnlineUsers();
      set({ onlineUsers: new Set(usernames) });
    } catch {
      // Non-fatal — presence dots just stay stale until the next fetch/event.
    }
  },

  applyEvent: (event) => {
    set((s) => {
      const next = new Set(s.onlineUsers);
      if (event.online) next.add(event.username);
      else next.delete(event.username);
      return { onlineUsers: next };
    });
  },

  isOnline: (username) => get().onlineUsers.has(username),
}));
