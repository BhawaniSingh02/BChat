import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { StoryGroup } from '../../types'

vi.mock('../../api/stories', () => ({
  storiesApi: {
    getFeed: vi.fn(),
    create: vi.fn(),
    markViewed: vi.fn(),
    remove: vi.fn(),
  },
}))

import { useStoryStore, flattenStories } from '../../store/storyStore'
import { storiesApi } from '../../api/stories'

const group = (authorId: string, ...storyIds: string[]): StoryGroup => ({
  authorId,
  hasUnviewed: true,
  lastStoryAt: '2026-06-20T10:00:00Z',
  stories: storyIds.map((id) => ({
    id, authorId, type: 'TEXT', content: 'hi', createdAt: '2026-06-20T10:00:00Z',
    expiresAt: '2026-06-21T10:00:00Z', viewedByMe: false, viewerCount: 0,
  })),
})

describe('storyStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStoryStore.setState({ groups: [], loaded: false })
  })

  it('fetchFeed loads groups and marks loaded', async () => {
    vi.mocked(storiesApi.getFeed).mockResolvedValue([group('alice', 's1')])
    await useStoryStore.getState().fetchFeed()
    expect(useStoryStore.getState().groups).toHaveLength(1)
    expect(useStoryStore.getState().loaded).toBe(true)
  })

  it('createStory posts then refetches the feed', async () => {
    vi.mocked(storiesApi.create).mockResolvedValue({} as never)
    vi.mocked(storiesApi.getFeed).mockResolvedValue([group('alice', 's1')])
    await useStoryStore.getState().createStory({ type: 'TEXT', content: 'yo' })
    expect(storiesApi.create).toHaveBeenCalledWith({ type: 'TEXT', content: 'yo' })
    expect(useStoryStore.getState().groups).toHaveLength(1)
  })

  it('markViewed optimistically flags the story and clears hasUnviewed', async () => {
    useStoryStore.setState({ groups: [group('bob', 's1')] })
    vi.mocked(storiesApi.markViewed).mockResolvedValue()
    await useStoryStore.getState().markViewed('s1')
    const g = useStoryStore.getState().groups[0]
    expect(g.stories[0].viewedByMe).toBe(true)
    expect(g.hasUnviewed).toBe(false)
  })

  it('deleteStory removes the story and drops empty groups', async () => {
    useStoryStore.setState({ groups: [group('alice', 's1')] })
    vi.mocked(storiesApi.remove).mockResolvedValue()
    await useStoryStore.getState().deleteStory('s1')
    expect(useStoryStore.getState().groups).toHaveLength(0)
  })

  it('flattenStories returns all stories across groups in order', () => {
    const groups = [group('alice', 's1', 's2'), group('bob', 's3')]
    expect(flattenStories(groups).map((s) => s.id)).toEqual(['s1', 's2', 's3'])
  })
})
