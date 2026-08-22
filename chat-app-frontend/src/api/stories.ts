import client from './client'
import type { CreateStoryRequest, Story, StoryGroup } from '../types'

export const storiesApi = {
  getFeed: async (): Promise<StoryGroup[]> => {
    const { data } = await client.get<StoryGroup[]>('/stories/feed')
    return data
  },

  create: async (req: CreateStoryRequest): Promise<Story> => {
    const { data } = await client.post<Story>('/stories', req)
    return data
  },

  markViewed: async (storyId: string): Promise<void> => {
    await client.post(`/stories/${storyId}/view`)
  },

  reply: async (storyId: string, text: string): Promise<void> => {
    await client.post(`/stories/${storyId}/reply`, { text })
  },

  react: async (storyId: string, emoji: string): Promise<Story> => {
    const { data } = await client.post<Story>(`/stories/${storyId}/react`, { emoji })
    return data
  },

  getViewers: async (storyId: string): Promise<string[]> => {
    const { data } = await client.get<{ viewers: string[] }>(`/stories/${storyId}/viewers`)
    return data.viewers
  },

  remove: async (storyId: string): Promise<void> => {
    await client.delete(`/stories/${storyId}`)
  },
}
