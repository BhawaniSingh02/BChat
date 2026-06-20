import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { StoryGroup, User } from '../../types'

const markViewed = vi.fn()
const deleteStory = vi.fn()
vi.mock('../../store/storyStore', () => ({
  useStoryStore: (selector: (s: { markViewed: typeof markViewed; deleteStory: typeof deleteStory }) => unknown) =>
    selector({ markViewed, deleteStory }),
}))
vi.mock('../../api/stories', () => ({
  storiesApi: {
    reply: vi.fn().mockResolvedValue(undefined),
    getViewers: vi.fn().mockResolvedValue([]),
  },
}))

import StoryViewer from '../../components/story/StoryViewer'
import { storiesApi } from '../../api/stories'
import { useUserCacheStore } from '../../store/userCacheStore'

const bob: User = { id: 'b', username: 'bob', email: 'b@e.com', displayName: 'Bob', uniqueHandle: 'bob', createdAt: '', lastSeen: '' }

const makeGroup = (authorId: string, ...ids: string[]): StoryGroup => ({
  authorId, hasUnviewed: true, lastStoryAt: '2026-06-20T10:00:00Z',
  stories: ids.map((id) => ({
    id, authorId, type: 'TEXT', content: `story ${id}`, backgroundColor: 'teal',
    createdAt: '2026-06-20T10:00:00Z', expiresAt: '2026-06-21T10:00:00Z', viewedByMe: false, viewerCount: 3,
  })),
})

describe('StoryViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    markViewed.mockResolvedValue(undefined)
    deleteStory.mockResolvedValue(undefined)
    useUserCacheStore.setState({ cache: { bob }, fetching: new Set() })
  })

  it('renders the first story and marks it viewed (not own)', async () => {
    render(<StoryViewer groups={[makeGroup('bob', 's1', 's2')]} startGroupIndex={0} currentUsername="me" onClose={vi.fn()} />)
    expect(screen.getByTestId('story-text-content')).toHaveTextContent('story s1')
    expect(screen.getByText('Bob')).toBeInTheDocument()
    await waitFor(() => expect(markViewed).toHaveBeenCalledWith('s1'))
  })

  it('advances to the next story on tapping the next zone', () => {
    render(<StoryViewer groups={[makeGroup('bob', 's1', 's2')]} startGroupIndex={0} currentUsername="me" onClose={vi.fn()} />)
    fireEvent.click(screen.getByTestId('story-next-zone'))
    expect(screen.getByTestId('story-text-content')).toHaveTextContent('story s2')
  })

  it('closes after the last story', () => {
    const onClose = vi.fn()
    render(<StoryViewer groups={[makeGroup('bob', 's1')]} startGroupIndex={0} currentUsername="me" onClose={onClose} />)
    fireEvent.click(screen.getByTestId('story-next-zone'))
    expect(onClose).toHaveBeenCalled()
  })

  it('does not mark your own story viewed, and shows the seen count + delete', () => {
    render(<StoryViewer groups={[makeGroup('me', 's1')]} startGroupIndex={0} currentUsername="me" onClose={vi.fn()} />)
    expect(markViewed).not.toHaveBeenCalled()
    expect(screen.getByTestId('story-seen-count')).toHaveTextContent('3')
    expect(screen.getByTestId('story-delete-btn')).toBeInTheDocument()
  })

  it('confirms before deleting, then deletes an own single story and closes', async () => {
    const onClose = vi.fn()
    render(<StoryViewer groups={[makeGroup('me', 's1')]} startGroupIndex={0} currentUsername="me" onClose={onClose} />)
    fireEvent.click(screen.getByTestId('story-delete-btn'))
    // confirmation appears; nothing deleted yet
    expect(screen.getByTestId('story-delete-confirm')).toBeInTheDocument()
    expect(deleteStory).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('story-delete-confirm-btn'))
    await waitFor(() => expect(deleteStory).toHaveBeenCalledWith('s1'))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('cancels delete without removing the story', () => {
    render(<StoryViewer groups={[makeGroup('me', 's1')]} startGroupIndex={0} currentUsername="me" onClose={vi.fn()} />)
    fireEvent.click(screen.getByTestId('story-delete-btn'))
    fireEvent.click(screen.getByTestId('story-delete-cancel'))
    expect(screen.queryByTestId('story-delete-confirm')).not.toBeInTheDocument()
    expect(deleteStory).not.toHaveBeenCalled()
  })

  it('shows a reply box for others’ stories and sends a reply', async () => {
    render(<StoryViewer groups={[makeGroup('bob', 's1')]} startGroupIndex={0} currentUsername="me" onClose={vi.fn()} />)
    const input = screen.getByTestId('story-reply-input')
    fireEvent.change(input, { target: { value: 'love this!' } })
    fireEvent.click(screen.getByTestId('story-reply-send'))
    await waitFor(() => expect(storiesApi.reply).toHaveBeenCalledWith('s1', 'love this!'))
    expect(await screen.findByTestId('story-reply-sent')).toBeInTheDocument()
  })

  it('does not show a reply box on your own story', () => {
    render(<StoryViewer groups={[makeGroup('me', 's1')]} startGroupIndex={0} currentUsername="me" onClose={vi.fn()} />)
    expect(screen.queryByTestId('story-reply-input')).not.toBeInTheDocument()
  })

  it('has a pause/play toggle that flips its label', () => {
    render(<StoryViewer groups={[makeGroup('bob', 's1')]} startGroupIndex={0} currentUsername="me" onClose={vi.fn()} />)
    const btn = screen.getByTestId('story-pause-btn')
    expect(btn).toHaveAttribute('aria-label', 'Pause story')
    fireEvent.click(btn)
    expect(screen.getByTestId('story-pause-btn')).toHaveAttribute('aria-label', 'Play story')
  })

  it('opens the viewers list with resolved names on tapping the view count', async () => {
    const alice: User = { id: 'a', username: 'alice', email: 'a@e.com', displayName: 'Alice', uniqueHandle: 'alice', createdAt: '', lastSeen: '' }
    useUserCacheStore.setState({ cache: { alice }, fetching: new Set() })
    vi.mocked(storiesApi.getViewers).mockResolvedValue(['alice'])

    render(<StoryViewer groups={[makeGroup('me', 's1')]} startGroupIndex={0} currentUsername="me" onClose={vi.fn()} />)
    fireEvent.click(screen.getByTestId('story-seen-count'))

    await waitFor(() => expect(storiesApi.getViewers).toHaveBeenCalledWith('s1'))
    expect(await screen.findByTestId('story-viewers-sheet')).toBeInTheDocument()
    expect(await screen.findByText('Alice')).toBeInTheDocument()
    expect(screen.getByTestId('story-viewer-row')).toBeInTheDocument()
  })

  it('shows an empty state in the viewers list when no one has viewed', async () => {
    vi.mocked(storiesApi.getViewers).mockResolvedValue([])
    render(<StoryViewer groups={[makeGroup('me', 's1')]} startGroupIndex={0} currentUsername="me" onClose={vi.fn()} />)
    fireEvent.click(screen.getByTestId('story-seen-count'))
    expect(await screen.findByTestId('story-viewers-empty')).toBeInTheDocument()
  })
})
