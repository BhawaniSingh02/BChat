import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StarredMessagesPanel from '../../components/chat/StarredMessagesPanel'
import { messagesApi } from '../../api/messages'
import type { Message } from '../../types'

vi.mock('../../api/messages', () => ({
  messagesApi: {
    getStarred: vi.fn(),
    toggleStar: vi.fn(),
  },
}))

const mockGetStarred = vi.mocked(messagesApi.getStarred)
const mockToggleStar = vi.mocked(messagesApi.toggleStar)

const starredMessage: Message = {
  id: 'msg-1',
  roomId: 'general',
  sender: 'bob',
  senderName: 'bob',
  content: 'Important message',
  messageType: 'TEXT',
  readBy: [],
  timestamp: '2026-04-01T10:00:00Z',
  starred: ['alice'],
}

describe('StarredMessagesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading indicator initially', () => {
    mockGetStarred.mockReturnValue(new Promise(() => {}))
    render(<StarredMessagesPanel onClose={vi.fn()} currentUsername="alice" />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows starred messages after loading', async () => {
    mockGetStarred.mockResolvedValue([starredMessage])
    render(<StarredMessagesPanel onClose={vi.fn()} currentUsername="alice" />)

    await waitFor(() => {
      expect(screen.getByText('Important message')).toBeInTheDocument()
    })
  })

  it('shows empty state when no starred messages', async () => {
    mockGetStarred.mockResolvedValue([])
    render(<StarredMessagesPanel onClose={vi.fn()} currentUsername="alice" />)

    await waitFor(() => {
      expect(screen.getByText(/No starred messages yet/i)).toBeInTheDocument()
    })
  })

  it('shows error message on fetch failure', async () => {
    mockGetStarred.mockRejectedValue(new Error('Network error'))
    render(<StarredMessagesPanel onClose={vi.fn()} currentUsername="alice" />)

    await waitFor(() => {
      expect(screen.getByTestId('starred-error')).toBeInTheDocument()
    })
  })

  it('calls onClose when back button is clicked', async () => {
    mockGetStarred.mockResolvedValue([])
    const onClose = vi.fn()
    render(<StarredMessagesPanel onClose={onClose} currentUsername="alice" />)

    await waitFor(() => {
      expect(screen.getByText(/No starred messages yet/i)).toBeInTheDocument()
    })

    await userEvent.click(screen.getByLabelText('Close starred messages'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('unstarring a message removes it from the list', async () => {
    mockGetStarred.mockResolvedValue([starredMessage])
    mockToggleStar.mockResolvedValue({ ...starredMessage, starred: [] })

    render(<StarredMessagesPanel onClose={vi.fn()} currentUsername="alice" />)

    await waitFor(() => {
      expect(screen.getByText('Important message')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('unstar-btn'))

    await waitFor(() => {
      expect(screen.queryByText('Important message')).not.toBeInTheDocument()
    })
  })

  it('shows photo label for image messages', async () => {
    const imageMsg: Message = {
      ...starredMessage,
      id: 'img-1',
      messageType: 'IMAGE',
      fileUrl: 'https://res.cloudinary.com/test/image.jpg',
    }
    mockGetStarred.mockResolvedValue([imageMsg])
    render(<StarredMessagesPanel onClose={vi.fn()} currentUsername="alice" />)

    await waitFor(() => {
      expect(screen.getByText(/Photo/)).toBeInTheDocument()
    })
  })
})
