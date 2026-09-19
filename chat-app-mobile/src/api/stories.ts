import apiClient from './client';
import { CreateStoryRequest, Story, StoryGroup } from '../types';

export const storiesApi = {
  getFeed: () => apiClient.get<StoryGroup[]>('/stories/feed').then((r) => r.data),

  create: (req: CreateStoryRequest) => apiClient.post<Story>('/stories', req).then((r) => r.data),

  markViewed: (storyId: string) => apiClient.post(`/stories/${storyId}/view`),

  reply: (storyId: string, text: string) => apiClient.post(`/stories/${storyId}/reply`, { text }),

  react: (storyId: string, emoji: string) =>
    apiClient.post<Story>(`/stories/${storyId}/react`, { emoji }).then((r) => r.data),

  getViewers: (storyId: string) =>
    apiClient.get<{ viewers: string[] }>(`/stories/${storyId}/viewers`).then((r) => r.data.viewers),

  remove: (storyId: string) => apiClient.delete(`/stories/${storyId}`),
};
