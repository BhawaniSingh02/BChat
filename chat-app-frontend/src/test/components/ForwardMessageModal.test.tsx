import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ForwardMessageModal from '../../components/chat/ForwardMessageModal'
import { messagesApi } from '../../api/messages'
import { useDMStore } from '../../store/dmStore'
import { useRoomStore } from '../../store/roomStore'
import { useAuthStore } from '../../store/authStore'
import type { Message } from '../../types'

vi.mock('../../api/messages', () => ({
  messagesApi: { forward: vi.fn() },
}))

vi.mock('../../store/dmStore', () => ({
  useDMStore: vi.fn(),
}))

vi.mock('../../store/roomStore', () => ({
  useRoomStore: vi.fn(),
}))

vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

const mockForward = vi.mocked(messagesApi.forward)
const mockUseDMStore = vi.mocked(useDMStore)
const mockUseRoomStore = vi.mocked(useRoomStore)
const mockUseAuthStore = vi.mocked(useAuthStore)

const testMessage: Message = {
  id: 'msg-1',
  roomId: 'general',
  sender: 'alice',
  senderName: 'alice',
  content: 'Forward this message',
  messageType: 'TEXT',
  readBy: [],
  timestamp: '2026-04-01T10:00:00Z',
}

describe('ForwardMessageModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseAuthStore.mockReturnValue({ user: { username: 'alice' } } as any)
    mockUseRoomStore.mockReturnValue({
      myRooms: [{ roomId: 'general', name: 'General', members: ['alice', 'bob'], memberCount: 2 }],
    } as any)
    mockUseDMStore.mockReturnValue({
      conversations: [{ id: 'conv-1', participants: ['alice', 'bob'], createdAt: '' }],
    } as any)
  })

  it('renders the modal with message preview', () => {
    render(<ForwardMessageModal message={testMessage} onClose={vi.fn()} />)
    expect(screen.getByTestId('forward-modal')).toBeInTheDocument()
    expect(screen.getByText('Forward this message')).toBeInTheDocument()
  })

  it('shows rooms and DM conversations', () => {
    render(<ForwardMessageModal message={testMessage} onClose={vi.fn()} />)
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText('bob')).toBeInTheDocument()
  })

  it('filters results by search query', async () => {
    render(<ForwardMessageModal message={testMessage} onClose={vi.fn()} />)

    await userEvent.type(screen.getByTestId('forward-search'), 'General')

    expect(screen.getByText('General')).toBeInTheDocument()
  })

  it('forwards to a room and shows success', async () => {
    mockForward.mockResolvedValue({ ...testMessage, roomId: 'general' })
    render(<ForwardMessageModal message={testMessage} onClose={vi.fn()} />)

    await userEvent.click(screen.getByTestId('forward-room-general'))

    await waitFor(() => {
      expect(mockForward).toHaveBeenCalledWith('msg-1', { roomId: 'general' })
      expect(screen.getByTestId('forward-success')).toBeInTheDocument()
    })
  })

  it('forwards to a DM and shows success', async () => {
    mockForward.mockResolvedValue({ ...testMessage, roomId: 'dm:conv-1' })
    render(<ForwardMessageModal message={testMessage} onClose={vi.fn()} />)

    await userEvent.click(screen.getByTestId('forward-dm-conv-1'))

    await waitFor(() => {
      expect(mockForward).toHaveBeenCalledWith('msg-1', { conversationId: 'conv-1' })
      expect(screen.getByTestId('forward-success')).toBeInTheDocument()
    })
  })

  it('shows error message on forward failure', async () => {
    mockForward.mockRejectedValue(new Error('Network error'))
    render(<ForwardMessageModal message={testMessage} onClose={vi.fn()} />)

    await userEvent.click(screen.getByTestId('forward-room-general'))

    await waitFor(() => {
      expect(screen.getByTestId('forward-error')).toBeInTheDocument()
    })
  })

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn()
    render(<ForwardMessageModal message={testMessage} onClose={onClose} />)

    await userEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows empty state when no results match search', async () => {
    render(<ForwardMessageModal message={testMessage} onClose={vi.fn()} />)

    await userEvent.type(screen.getByTestId('forward-search'), 'XXXXXXXXXNONEXISTENT')

    expect(screen.getByText('No results')).toBeInTheDocument()
  })
})
