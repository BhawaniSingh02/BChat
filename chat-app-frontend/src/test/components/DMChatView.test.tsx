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

  it('shows selection action bar when a message is long-pressed', async () => {
    mockMessages = [makeMsg('m1')]
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
        onEditMessage={vi.fn()}
      />
    )
    const msgEl = screen.getByTestId('message-bubble').closest('[id^="msg-"]')!
    fireEvent.mouseDown(msgEl)
    await new Promise((r) => setTimeout(r, 600))
    expect(screen.getByTestId('selection-action-bar')).toBeInTheDocument()
  })

  it('shows delete button in selection action bar for own messages', async () => {
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
    const msgEl = screen.getByTestId('message-bubble').closest('[id^="msg-"]')!
    fireEvent.mouseDown(msgEl)
    await new Promise((r) => setTimeout(r, 600))
    fireEvent.click(screen.getByTestId('selection-delete-btn'))
    expect(onDelete).toHaveBeenCalledWith('m1')
  })

  // ── Phase 17 — Call buttons ───────────────────────────────────────────────

  it('shows audio call button when onAudioCall is provided', () => {
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
        onAudioCall={vi.fn()}
      />
    )
    expect(screen.getByTestId('audio-call-btn')).toBeInTheDocument()
  })

  it('shows video call button when onVideoCall is provided', () => {
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
        onVideoCall={vi.fn()}
      />
    )
    expect(screen.getByTestId('video-call-btn')).toBeInTheDocument()
  })

  it('shows call history button when onViewCallHistory is provided', () => {
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
        onViewCallHistory={vi.fn()}
      />
    )
    expect(screen.getByTestId('call-history-btn')).toBeInTheDocument()
  })

  it('does not show audio call button when onAudioCall is not provided', () => {
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
      />
    )
    expect(screen.queryByTestId('audio-call-btn')).not.toBeInTheDocument()
  })

  it('does not show video call button when onVideoCall is not provided', () => {
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
      />
    )
    expect(screen.queryByTestId('video-call-btn')).not.toBeInTheDocument()
  })

  it('calls onAudioCall when audio call button is clicked', () => {
    const onAudioCall = vi.fn()
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
        onAudioCall={onAudioCall}
      />
    )
    fireEvent.click(screen.getByTestId('audio-call-btn'))
    expect(onAudioCall).toHaveBeenCalledOnce()
  })

  it('calls onVideoCall when video call button is clicked', () => {
    const onVideoCall = vi.fn()
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
        onVideoCall={onVideoCall}
      />
    )
    fireEvent.click(screen.getByTestId('video-call-btn'))
    expect(onVideoCall).toHaveBeenCalledOnce()
  })

  it('calls onViewCallHistory when call history button is clicked', () => {
    const onViewCallHistory = vi.fn()
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
        onViewCallHistory={onViewCallHistory}
      />
    )
    fireEvent.click(screen.getByTestId('call-history-btn'))
    expect(onViewCallHistory).toHaveBeenCalledOnce()
  })

  // ── Missed call bubble with call-back button ──────────────────────────────

  it('shows missed call bubble for missed audio call message', () => {
    mockMessages = [{
      id: 'm-missed',
      roomId: 'dm:conv-1',
      sender: 'bob',
      senderName: 'bob',
      content: '📞 Missed audio call',
      messageType: 'TEXT',
      readBy: [],
      timestamp: '2026-03-28T10:00:00',
    }]
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
        onCallBack={vi.fn()}
      />
    )
    expect(screen.getByTestId('missed-call-bubble')).toBeInTheDocument()
  })

  it('shows call-back button on missed call bubble when callee is viewing', () => {
    mockMessages = [{
      id: 'm-missed',
      roomId: 'dm:conv-1',
      sender: 'bob',
      senderName: 'bob',
      content: '📞 Missed audio call',
      messageType: 'TEXT',
      readBy: [],
      timestamp: '2026-03-28T10:00:00',
    }]
    const onCallBack = vi.fn()
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
        onCallBack={onCallBack}
      />
    )
    expect(screen.getByTestId('call-back-btn')).toBeInTheDocument()
  })

  it('calls onCallBack when call-back button is clicked', () => {
    mockMessages = [{
      id: 'm-missed',
      roomId: 'dm:conv-1',
      sender: 'bob',
      senderName: 'bob',
      content: '📞 Missed audio call',
      messageType: 'TEXT',
      readBy: [],
      timestamp: '2026-03-28T10:00:00',
    }]
    const onCallBack = vi.fn()
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
        onCallBack={onCallBack}
      />
    )
    fireEvent.click(screen.getByTestId('call-back-btn'))
    expect(onCallBack).toHaveBeenCalledOnce()
  })

  it('shows missed call bubble for missed video call message', () => {
    mockMessages = [{
      id: 'm-missed-video',
      roomId: 'dm:conv-1',
      sender: 'bob',
      senderName: 'bob',
      content: '📹 Missed video call',
      messageType: 'TEXT',
      readBy: [],
      timestamp: '2026-03-28T10:00:00',
    }]
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
        onCallBack={vi.fn()}
      />
    )
    expect(screen.getByTestId('missed-call-bubble')).toBeInTheDocument()
  })

  it('does not show call-back button when onCallBack is not provided', () => {
    mockMessages = [{
      id: 'm-missed',
      roomId: 'dm:conv-1',
      sender: 'bob',
      senderName: 'bob',
      content: '📞 Missed audio call',
      messageType: 'TEXT',
      readBy: [],
      timestamp: '2026-03-28T10:00:00',
    }]
    render(
      <DMChatView
        conversation={makeConv()}
        currentUsername="alice"
        onSend={onSend}
      />
    )
    expect(screen.queryByTestId('call-back-btn')).not.toBeInTheDocument()
  })
})
