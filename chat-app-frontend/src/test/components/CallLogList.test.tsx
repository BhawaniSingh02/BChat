import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { CallSession, User } from '../../types'

vi.mock('../../api/calls', () => ({
  callsApi: {
    getMyCallHistory: vi.fn(),
    getCallHistory: vi.fn(),
  },
}))

import CallLogList from '../../components/call/CallLogList'
import { useCallStore } from '../../store/callStore'
import { useUserCacheStore } from '../../store/userCacheStore'
import { callsApi } from '../../api/calls'

const makeSession = (over: Partial<CallSession> = {}): CallSession => ({
  id: 's1',
  conversationId: 'conv-1',
  callerId: 'me-id',
  calleeId: 'bob-id',
  callType: 'AUDIO',
  status: 'ENDED',
  startedAt: '2026-06-19T10:00:00Z',
  durationSeconds: 60,
  ...over,
})

const bob: User = {
  id: 'b', username: 'bob-id', email: 'bob@e.com', displayName: 'Bob Tester',
  uniqueHandle: 'bob', createdAt: '', lastSeen: '',
}

describe('CallLogList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCallStore.setState({ myCallHistory: [], myCallHistoryLoaded: false })
    useUserCacheStore.setState({ cache: { 'bob-id': bob }, fetching: new Set() })
  })

  it('shows an empty state when there are no calls', async () => {
    vi.mocked(callsApi.getMyCallHistory).mockResolvedValue([])
    render(<CallLogList currentUsername="me-id" onStartCall={vi.fn()} onOpenConversation={vi.fn()} />)
    expect(await screen.findByTestId('call-log-empty')).toBeInTheDocument()
  })

  it('renders a call row with the resolved name and an Outgoing label', async () => {
    vi.mocked(callsApi.getMyCallHistory).mockResolvedValue([makeSession()])
    render(<CallLogList currentUsername="me-id" onStartCall={vi.fn()} onOpenConversation={vi.fn()} />)
    expect(await screen.findByTestId('call-log-item')).toBeInTheDocument()
    expect(screen.getByText('Bob Tester')).toBeInTheDocument()
    expect(screen.getByText('Outgoing')).toBeInTheDocument()
  })

  it('labels an incoming unanswered call as Missed', async () => {
    vi.mocked(callsApi.getMyCallHistory).mockResolvedValue([
      makeSession({ callerId: 'bob-id', calleeId: 'me-id', status: 'MISSED', callType: 'VIDEO' }),
    ])
    render(<CallLogList currentUsername="me-id" onStartCall={vi.fn()} onOpenConversation={vi.fn()} />)
    expect(await screen.findByText('Missed')).toBeInTheDocument()
  })

  it('calls back with the conversation, other user and call type', async () => {
    vi.mocked(callsApi.getMyCallHistory).mockResolvedValue([makeSession({ callType: 'VIDEO' })])
    const onStartCall = vi.fn()
    render(<CallLogList currentUsername="me-id" onStartCall={onStartCall} onOpenConversation={vi.fn()} />)
    fireEvent.click(await screen.findByTestId('call-log-callback'))
    expect(onStartCall).toHaveBeenCalledWith('conv-1', 'bob-id', 'VIDEO')
  })

  it('opens the conversation when the row is clicked', async () => {
    vi.mocked(callsApi.getMyCallHistory).mockResolvedValue([makeSession()])
    const onOpenConversation = vi.fn()
    render(<CallLogList currentUsername="me-id" onStartCall={vi.fn()} onOpenConversation={onOpenConversation} />)
    await screen.findByTestId('call-log-item')
    fireEvent.click(screen.getByText('Bob Tester'))
    await waitFor(() => expect(onOpenConversation).toHaveBeenCalledWith('conv-1'))
  })
})
