import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DirectConversation, User } from '../../types'

vi.mock('../../api/dm', () => ({
  dmApi: {
    getRequests: vi.fn(),
    acceptRequest: vi.fn(),
    declineRequest: vi.fn(),
    getMessages: vi.fn().mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 1, last: true }),
  },
}))

import MessageRequestsModal from '../../components/chat/MessageRequestsModal'
import { useDMStore } from '../../store/dmStore'
import { useUserCacheStore } from '../../store/userCacheStore'
import { dmApi } from '../../api/dm'

const req: DirectConversation = {
  id: 'r1',
  participants: ['me-id', 'bob-id'],
  createdAt: '2026-01-01T00:00:00',
  status: 'PENDING',
  initiatedBy: 'bob-id',
}

const bob: User = {
  id: 'b', username: 'bob-id', email: 'bob@e.com', displayName: 'Bob Tester',
  uniqueHandle: 'bob', createdAt: '', lastSeen: '',
}

describe('MessageRequestsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(dmApi.getRequests).mockResolvedValue([req])
    useDMStore.setState({ requests: [req], conversations: [] })
    useUserCacheStore.setState({ cache: { 'bob-id': bob }, fetching: new Set() })
  })

  it('lists a request with the requester name and handle', async () => {
    render(<MessageRequestsModal open onClose={vi.fn()} currentUsername="me-id" onOpenConversation={vi.fn()} />)
    expect(await screen.findByTestId('message-request-item')).toBeInTheDocument()
    expect(screen.getByText('Bob Tester')).toBeInTheDocument()
    expect(screen.getByText('@bob')).toBeInTheDocument()
  })

  it('accepting opens the conversation and closes', async () => {
    vi.mocked(dmApi.acceptRequest).mockResolvedValue({ ...req, status: 'ACCEPTED' })
    const onOpen = vi.fn()
    const onClose = vi.fn()
    render(<MessageRequestsModal open onClose={onClose} currentUsername="me-id" onOpenConversation={onOpen} />)

    fireEvent.click(await screen.findByTestId('accept-request-btn'))

    await waitFor(() => expect(dmApi.acceptRequest).toHaveBeenCalledWith('r1'))
    await waitFor(() => expect(onOpen).toHaveBeenCalledWith('r1'))
    expect(onClose).toHaveBeenCalled()
  })

  it('declining removes the request', async () => {
    vi.mocked(dmApi.declineRequest).mockResolvedValue(undefined)
    render(<MessageRequestsModal open onClose={vi.fn()} currentUsername="me-id" onOpenConversation={vi.fn()} />)

    fireEvent.click(await screen.findByTestId('decline-request-btn'))

    await waitFor(() => expect(dmApi.declineRequest).toHaveBeenCalledWith('r1'))
    await waitFor(() => expect(useDMStore.getState().requests).toHaveLength(0))
  })

  it('shows an empty state when there are no requests', () => {
    useDMStore.setState({ requests: [] })
    vi.mocked(dmApi.getRequests).mockResolvedValue([])
    render(<MessageRequestsModal open onClose={vi.fn()} currentUsername="me-id" onOpenConversation={vi.fn()} />)
    expect(screen.getByText('No message requests')).toBeInTheDocument()
  })
})
