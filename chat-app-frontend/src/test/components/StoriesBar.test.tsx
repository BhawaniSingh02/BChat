import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { StoryGroup, User } from '../../types'

vi.mock('../../api/stories', () => ({
  storiesApi: { getFeed: vi.fn(), create: vi.fn(), markViewed: vi.fn().mockResolvedValue(undefined), remove: vi.fn(), getViewers: vi.fn() },
}))

import StoriesBar from '../../components/story/StoriesBar'
import { storiesApi } from '../../api/stories'
import { useStoryStore } from '../../store/storyStore'
import { useUserCacheStore } from '../../store/userCacheStore'

const bob: User = { id: 'b', username: 'bob', email: 'b@e.com', displayName: 'Bob', uniqueHandle: 'bob', createdAt: '', lastSeen: '' }

const group = (authorId: string, hasUnviewed = true): StoryGroup => ({
  authorId, hasUnviewed, lastStoryAt: '2026-06-20T10:00:00Z',
  stories: [{ id: `${authorId}-1`, authorId, type: 'TEXT', content: 'hi', createdAt: '2026-06-20T10:00:00Z', expiresAt: '2026-06-21T10:00:00Z', viewedByMe: false, viewerCount: 0 }],
})

describe('StoriesBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStoryStore.setState({ groups: [], loaded: false })
    useUserCacheStore.setState({ cache: { bob }, fetching: new Set() })
  })

  it('always shows the "Your story" tile', async () => {
    vi.mocked(storiesApi.getFeed).mockResolvedValue([])
    render(<StoriesBar currentUsername="me" />)
    expect(await screen.findByTestId('your-story-tile')).toBeInTheDocument()
  })

  it('renders other authors’ story tiles with resolved names', async () => {
    vi.mocked(storiesApi.getFeed).mockResolvedValue([group('bob')])
    render(<StoriesBar currentUsername="me" />)
    expect(await screen.findByTestId('story-tile')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('opens the composer from the add badge', async () => {
    vi.mocked(storiesApi.getFeed).mockResolvedValue([])
    render(<StoriesBar currentUsername="me" />)
    fireEvent.click(await screen.findByTestId('add-story-badge'))
    expect(screen.getByTestId('story-composer')).toBeInTheDocument()
  })

  it('opens the viewer when a story tile is clicked', async () => {
    vi.mocked(storiesApi.getFeed).mockResolvedValue([group('bob')])
    render(<StoriesBar currentUsername="me" />)
    fireEvent.click(await screen.findByTestId('story-tile'))
    await waitFor(() => expect(screen.getByTestId('story-viewer')).toBeInTheDocument())
  })
})
