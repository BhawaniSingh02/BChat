import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ThreadPanel from '../../components/chat/ThreadPanel'
import type { Message } from '../../types'

// Mock threads API
vi.mock('../../api/threads', () => ({
  threadsApi: {
    getThreadReplies: vi.fn(),
  },
}))

// Mock upload API
vi.mock('../../api/upload', () => ({
  uploadApi: {
    uploadFile: vi.fn(),
  },
}))

import { threadsApi } from '../../api/threads'

const rootMessage: Message = {
  id: 'root1',
  roomId: 'general',
  sender: 'alice',
  senderName: 'Alice',
  content: 'What do you think about this feature?',
  messageType: 'TEXT',
  readBy: [],
  timestamp: '2025-01-01T10:00:00Z',
  threadReplyCount: 2,
}

const replies: Message[] = [
  {
    id: 'reply1',
    roomId: 'general',
    sender: 'bob',
    senderName: 'Bob',
    content: 'Great idea!',
    messageType: 'TEXT',
    readBy: [],
    timestamp: '2025-01-01T10:01:00Z',
    threadId: 'root1',
  },
  {
    id: 'reply2',
    roomId: 'general',
    sender: 'carol',
    senderName: 'Carol',
    content: 'Agreed, let\'s do it.',
    messageType: 'TEXT',
    readBy: [],
    timestamp: '2025-01-01T10:02:00Z',
    threadId: 'root1',
  },
]

describe('ThreadPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(threadsApi.getThreadReplies).mockResolvedValue(replies)
  })

  it('renders thread panel', () => {
    render(
      <ThreadPanel
        rootMessage={rootMessage}
        currentUsername="alice"
        onClose={vi.fn()}
        onSendReply={vi.fn()}
      />,
    )
    expect(screen.getByTestId('thread-panel')).toBeDefined()
  })

  it('shows root message preview', () => {
    render(
      <ThreadPanel
        rootMessage={rootMessage}
        currentUsername="alice"
        onClose={vi.fn()}
        onSendReply={vi.fn()}
      />,
    )
    expect(screen.getByText('What do you think about this feature?')).toBeDefined()
    expect(screen.getByText('Alice')).toBeDefined()
  })

  it('shows thread header with Thread title', () => {
    render(
      <ThreadPanel
        rootMessage={rootMessage}
        currentUsername="alice"
        onClose={vi.fn()}
        onSendReply={vi.fn()}
      />,
    )
    expect(screen.getByText('Thread')).toBeDefined()
  })

  it('loads and shows replies', async () => {
    render(
      <ThreadPanel
        rootMessage={rootMessage}
        currentUsername="alice"
        onClose={vi.fn()}
        onSendReply={vi.fn()}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('Great idea!')).toBeDefined()
      expect(screen.getByText("Agreed, let's do it.")).toBeDefined()
    })
  })

  it('shows empty state when no replies', async () => {
    vi.mocked(threadsApi.getThreadReplies).mockResolvedValue([])
    render(
      <ThreadPanel
        rootMessage={rootMessage}
        currentUsername="alice"
        onClose={vi.fn()}
        onSendReply={vi.fn()}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('No replies yet. Be the first!')).toBeDefined()
    })
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <ThreadPanel
        rootMessage={rootMessage}
        currentUsername="alice"
        onClose={onClose}
        onSendReply={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByTestId('thread-close-btn'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onSendReply when reply is submitted', async () => {
    const onSendReply = vi.fn()
    render(
      <ThreadPanel
        rootMessage={rootMessage}
        currentUsername="alice"
        onClose={vi.fn()}
        onSendReply={onSendReply}
      />,
    )

    const input = screen.getByTestId('thread-reply-input') as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: 'My reply here' } })
    fireEvent.click(screen.getByTestId('thread-send-btn'))

    expect(onSendReply).toHaveBeenCalledWith('root1', 'My reply here')
  })

  it('calls onSendReply on Enter key press', async () => {
    const onSendReply = vi.fn()
    render(
      <ThreadPanel
        rootMessage={rootMessage}
        currentUsername="alice"
        onClose={vi.fn()}
        onSendReply={onSendReply}
      />,
    )

    const input = screen.getByTestId('thread-reply-input') as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: 'Key enter reply' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })

    expect(onSendReply).toHaveBeenCalledWith('root1', 'Key enter reply')
  })

  it('does not send empty reply', () => {
    const onSendReply = vi.fn()
    render(
      <ThreadPanel
        rootMessage={rootMessage}
        currentUsername="alice"
        onClose={vi.fn()}
        onSendReply={onSendReply}
      />,
    )
    fireEvent.click(screen.getByTestId('thread-send-btn'))
    expect(onSendReply).not.toHaveBeenCalled()
  })

  it('send button is disabled when input is empty', () => {
    render(
      <ThreadPanel
        rootMessage={rootMessage}
        currentUsername="alice"
        onClose={vi.fn()}
        onSendReply={vi.fn()}
      />,
    )
    const sendBtn = screen.getByTestId('thread-send-btn') as HTMLButtonElement
    expect(sendBtn.disabled).toBe(true)
  })

  it('clears input after sending reply', () => {
    render(
      <ThreadPanel
        rootMessage={rootMessage}
        currentUsername="alice"
        onClose={vi.fn()}
        onSendReply={vi.fn()}
      />,
    )

    const input = screen.getByTestId('thread-reply-input') as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: 'Some reply' } })
    fireEvent.click(screen.getByTestId('thread-send-btn'))

    expect(input.value).toBe('')
  })
})
