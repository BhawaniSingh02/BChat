import { create } from 'zustand'
import type { User } from '../types'
import { usersApi } from '../api/users'

interface UserCacheState {
  /** username → User profile */
  cache: Record<string, User>
  /** usernames currently being fetched (prevent duplicate in-flight requests) */
  fetching: Set<string>
  /** Fetch a single user and store in cache. No-ops if already cached or in-flight. */
  fetchUser: (username: string) => void
  /** Fetch multiple users at once (deduplicates and skips cached ones). */
  prefetch: (usernames: string[]) => void
  /** Seed the cache with a user object already known (e.g. from authStore). */
  seed: (user: User) => void
  /** Returns cached avatarUrl for a username, or undefined if not yet loaded. */
  avatarUrl: (username: string) => string | undefined
}

export const useUserCacheStore = create<UserCacheState>((set, get) => ({
  cache: {},
  fetching: new Set(),

  fetchUser: (username: string) => {
    const { cache, fetching } = get()
    if (cache[username] || fetching.has(username)) return

    set((s) => ({ fetching: new Set(s.fetching).add(username) }))

    usersApi.get(username)
      .then((user) => {
        set((s) => {
          const next = new Set(s.fetching)
          next.delete(username)
          return { cache: { ...s.cache, [username]: user }, fetching: next }
        })
      })
      .catch(() => {
        set((s) => {
          const next = new Set(s.fetching)
          next.delete(username)
          return { fetching: next }
        })
      })
  },

  prefetch: (usernames: string[]) => {
    const { cache, fetching } = get()
    const needed = [...new Set(usernames)].filter((u) => u && !cache[u] && !fetching.has(u))
    needed.forEach((u) => get().fetchUser(u))
  },

  seed: (user: User) => {
    set((s) => ({ cache: { ...s.cache, [user.username]: user } }))
  },

  avatarUrl: (username: string) => get().cache[username]?.avatarUrl,
}))
