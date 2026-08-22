import { create } from 'zustand'
import type { CreateStoryRequest, Story, StoryGroup } from '../types'
import { storiesApi } from '../api/stories'

interface StoryState {
  groups: StoryGroup[]
  loaded: boolean
  fetchFeed: () => Promise<void>
  createStory: (req: CreateStoryRequest) => Promise<void>
  markViewed: (storyId: string) => Promise<void>
  reactToStory: (storyId: string, emoji: string) => Promise<void>
  deleteStory: (storyId: string) => Promise<void>
}

export const useStoryStore = create<StoryState>((set, get) => ({
  groups: [],
  loaded: false,

  fetchFeed: async () => {
    try {
      const groups = await storiesApi.getFeed()
      set({ groups, loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  createStory: async (req) => {
    await storiesApi.create(req)
    await get().fetchFeed()
  },

  markViewed: async (storyId) => {
    // Optimistically flag the story as viewed and recompute the group's unviewed state.
    set((s) => ({
      groups: s.groups.map((g) => {
        if (!g.stories.some((st) => st.id === storyId)) return g
        const stories = g.stories.map((st) =>
          st.id === storyId ? { ...st, viewedByMe: true } : st,
        )
        return { ...g, stories, hasUnviewed: stories.some((st) => !st.viewedByMe) }
      }),
    }))
    try {
      await storiesApi.markViewed(storyId)
    } catch { /* best-effort */ }
  },

  reactToStory: async (storyId, emoji) => {
    const prevGroups = get().groups
    // Optimistic toggle: mirror the backend's one-reaction-per-user toggle logic.
    set((s) => ({
      groups: s.groups.map((g) => ({
        ...g,
        stories: g.stories.map((st) => {
          if (st.id !== storyId) return st
          const reactions = { ...st.reactions }
          if (st.myReaction) {
            reactions[st.myReaction] = Math.max(0, (reactions[st.myReaction] ?? 1) - 1)
            if (reactions[st.myReaction] === 0) delete reactions[st.myReaction]
          }
          const isNew = st.myReaction !== emoji
          if (isNew) reactions[emoji] = (reactions[emoji] ?? 0) + 1
          return { ...st, reactions, myReaction: isNew ? emoji : null }
        }),
      })),
    }))
    try {
      await storiesApi.react(storyId, emoji)
    } catch {
      set({ groups: prevGroups })
    }
  },

  deleteStory: async (storyId) => {
    await storiesApi.remove(storyId)
    set((s) => ({
      groups: s.groups
        .map((g) => ({ ...g, stories: g.stories.filter((st) => st.id !== storyId) }))
        .filter((g) => g.stories.length > 0),
    }))
  },
}))

/** A flat list of all stories in feed order (for navigating across authors). */
export function flattenStories(groups: StoryGroup[]): Story[] {
  return groups.flatMap((g) => g.stories)
}
