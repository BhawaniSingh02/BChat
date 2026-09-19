import { create } from 'zustand';
import { usersApi } from '../api/users';
import { UserSummary } from '../types';

interface UserCacheState {
  users: Record<string, UserSummary>;
  pending: Record<string, boolean>;
  getUser: (username: string) => Promise<UserSummary | null>;
}

export const useUserCacheStore = create<UserCacheState>((set, get) => ({
  users: {},
  pending: {},

  getUser: async (username) => {
    const cached = get().users[username];
    if (cached) return cached;
    if (get().pending[username]) return null;
    set((s) => ({ pending: { ...s.pending, [username]: true } }));
    try {
      const user = await usersApi.getByUsername(username);
      set((s) => ({ users: { ...s.users, [username]: user }, pending: { ...s.pending, [username]: false } }));
      return user;
    } catch {
      set((s) => ({ pending: { ...s.pending, [username]: false } }));
      return null;
    }
  },
}));
