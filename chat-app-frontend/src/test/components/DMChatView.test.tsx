import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DMChatView from '../../components/chat/DMChatView'
import type { DirectConversation, Message } from '../../types'

// Mock stores at module level
const mockFetchMessages = vi.fn()
const mockIsOnline = vi.fn(() => false)
let mockMessages: Message[] = []
let mockIsLoading = false

vi.mock('../../store/dmStore', () => ({
  useDMStore: (selector: (s: any) => any) => {
    const state = {
      messages: { 'conv-1': mockMessages },
      isLoading: mockIsLoading,
      fetchMessages: mockFetchMessages,
    }
    return selector(state)
  },
}))

vi.mock('../../store/presenceStore', () => ({
  usePresenceStore: (selector: (s: any) => any) => {
    const state = { isOnline: mockIsOnline }
    return selector(state)
  },
}))

const makeConv = (): DirectConversation => ({
  id: 'conv-1',
  participants: ['alice', 'bob'],
  createdAt: '2026-03-28T10:00:00',
})

const makeMsg = (id: string): Message => ({
  id,
  roomId: 'dm:conv-1',
  sender: 'alice',
  senderName: 'alice',
  content: `Message ${id}`,
  messageType: 'TEXT',
  readBy: [],
  timestamp: '2026-03-28T10:00:00',
})

describe('DMChatView', () => {
  const onSend = vi.fn()

  beforeEach(() => {
    mockMessages = []
    mockIsLoading = false
    mockIsOnline.mockReturnValue(false)
    mockFetchMessages.mockReset()
    onSend.mockReset()
  })

  it('renders the other participants name in the header', () => {
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
      />
    )
    expect(screen.getAllByText('bob').length).toBeGreaterThan(0)
  })

  it('shows Online when other user is online', () => {
    mockIsOnline.mockReturnValue(true)
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
      />
    )
    expect(screen.getByText('online')).toBeInTheDocument()
  })

  it('shows Offline when other user is offline', () => {
    mockIsOnline.mockReturnValue(false)
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
      />
    )
    expect(screen.getByText('offline')).toBeInTheDocument()
  })

  it('shows loading indicator when isLoading=true', () => {
    mockIsLoading = true
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
      />
    )
    expect(screen.getByText('Loading messages…')).toBeInTheDocument()
  })

  it('renders messages from store', () => {
    mockMessages = [makeMsg('m1'), makeMsg('m2')]
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
      />
    )
    expect(screen.getByText('Message m1')).toBeInTheDocument()
    expect(screen.getByText('Message m2')).toBeInTheDocument()
  })

  it('calls fetchMessages on mount', () => {
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
      />
    )
    expect(mockFetchMessages).toHaveBeenCalledWith('conv-1')
  })

  it('renders message input with correct placeholder', () => {
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
      />
    )
    expect(screen.getByPlaceholderText('Message bob')).toBeInTheDocument()
  })

  it('shows react button on own message hover when onReactMessage provided', () => {
    mockMessages = [makeMsg('m1')]
    const onReact = vi.fn()
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
        onReactMessage={onReact}
      />
    )
    const bubble = screen.getByTestId('message-bubble')
    fireEvent.mouseEnter(bubble.closest('[id^="msg-"]')!)
    expect(screen.getByTestId('react-btn')).toBeInTheDocument()
  })

  it('shows edit button on own message hover when onEditMessage provided', () => {
    mockMessages = [makeMsg('m1')]
    const onEdit = vi.fn()
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
        onEditMessage={onEdit}
      />
    )
    const bubble = screen.getByTestId('message-bubble')
    fireEvent.mouseEnter(bubble.closest('[id^="msg-"]')!)
    expect(screen.getByTestId('edit-message-btn')).toBeInTheDocument()
  })

  it('shows delete button on own message hover when onDeleteMessage provided', () => {
    mockMessages = [makeMsg('m1')]
    const onDelete = vi.fn()
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
        onDeleteMessage={onDelete}
      />
    )
    const bubble = screen.getByTestId('message-bubble')
    fireEvent.mouseEnter(bubble.closest('[id^="msg-"]')!)
    expect(screen.getByTestId('delete-message-btn')).toBeInTheDocument()
  })

  it('calls onDeleteMessage when delete btn clicked', () => {
    mockMessages = [makeMsg('m1')]
    const onDelete = vi.fn()
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
        onDeleteMessage={onDelete}
      />
    )
    const bubble = screen.getByTestId('message-bubble')
    fireEvent.mouseEnter(bubble.closest('[id^="msg-"]')!)
    fireEvent.click(screen.getByTestId('delete-message-btn'))
    expect(onDelete).toHaveBeenCalledWith('m1')
  })
})
