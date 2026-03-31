import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MessageBubble from '../../components/chat/MessageBubble'
import type { Message } from '../../types'

const baseMessage: Message = {
  id: 'msg-1',
  roomId: 'general',
  sender: 'alice',
  senderName: 'alice',
  content: 'Hello World',
  messageType: 'TEXT',
  readBy: [],
  timestamp: '2026-03-28T10:30:00',
}

describe('MessageBubble', () => {
  it('renders message content', () => {
    render(<MessageBubble message={baseMessage} isMine={false} />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('aligns to right for own messages', () => {
    const { container } = render(<MessageBubble message={baseMessage} isMine />)
    expect(container.firstChild).toHaveClass('justify-end')
  })

  it('aligns to left for others messages', () => {
    const { container } = render(<MessageBubble message={baseMessage} isMine={false} />)
    expect(container.firstChild).toHaveClass('justify-start')
  })

  it('applies green background for own messages', () => {
    render(<MessageBubble message={baseMessage} isMine />)
    expect(screen.getByTestId('message-bubble')).toHaveClass('bg-[#dcf8c6]')
  })

  it('applies white background for others messages', () => {
    render(<MessageBubble message={baseMessage} isMine={false} />)
    expect(screen.getByTestId('message-bubble')).toHaveClass('bg-white')
  })

  it('shows sender name when showSender=true and not mine', () => {
    render(<MessageBubble message={baseMessage} isMine={false} showSender />)
    expect(screen.getByText('alice')).toBeInTheDocument()
  })

  it('does not show sender name when showSender=false', () => {
    render(<MessageBubble message={{ ...baseMessage, senderName: 'alice' }} isMine={false} showSender={false} />)
    const senderLabels = screen.queryAllByText('alice')
    expect(senderLabels).toHaveLength(0)
  })

  it('shows single tick when not read by others', () => {
    render(<MessageBubble message={{ ...baseMessage, readBy: [] }} isMine />)
    expect(screen.getByLabelText('Delivered')).toBeInTheDocument()
  })

  it('shows double tick when read by others', () => {
    render(<MessageBubble message={{ ...baseMessage, readBy: ['alice', 'bob'] }} isMine />)
    expect(screen.getByLabelText('Read')).toBeInTheDocument()
  })

  it('renders image for IMAGE message type with trusted Cloudinary URL', () => {
    const imageMsg: Message = {
      ...baseMessage,
      messageType: 'IMAGE',
      fileUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      content: '',
    }
    render(<MessageBubble message={imageMsg} isMine={false} />)
    expect(screen.getByRole('img', { name: 'shared' })).toBeInTheDocument()
  })

  it('renders video for VIDEO message type with trusted Cloudinary URL', () => {
    const videoMsg: Message = {
      ...baseMessage,
      messageType: 'VIDEO',
      fileUrl: 'https://res.cloudinary.com/demo/video/upload/clip.mp4',
      content: '',
    }
    render(<MessageBubble message={videoMsg} isMine={false} />)
    expect(screen.getByTestId('message-video')).toBeInTheDocument()
  })

  it('does not render video for VIDEO message type with untrusted URL', () => {
    const videoMsg: Message = {
      ...baseMessage,
      messageType: 'VIDEO',
      fileUrl: 'https://evil.com/tracker.mp4',
      content: '',
    }
    render(<MessageBubble message={videoMsg} isMine={false} />)
    expect(screen.queryByTestId('message-video')).not.toBeInTheDocument()
  })

  it('does not render image for IMAGE message type with untrusted URL', () => {
    const imageMsg: Message = {
      ...baseMessage,
      messageType: 'IMAGE',
      fileUrl: 'https://evil.com/tracker.jpg',
      content: '',
    }
    render(<MessageBubble message={imageMsg} isMine={false} />)
    expect(screen.queryByRole('img', { name: 'shared' })).not.toBeInTheDocument()
  })

  it('renders image for IMAGE message type with local API URL (dev fallback)', () => {
    const imageMsg: Message = {
      ...baseMessage,
      messageType: 'IMAGE',
      fileUrl: 'http://localhost:8080/api/v1/files/uuid_photo.jpg',
      content: '',
    }
    render(<MessageBubble message={imageMsg} isMine={false} />)
    // In test/dev mode import.meta.env.DEV is true, so localhost is trusted
    expect(screen.getByRole('img', { name: 'shared' })).toBeInTheDocument()
  })

  it('renders download link for FILE message type with trusted Cloudinary URL', () => {
    const fileMsg: Message = {
      ...baseMessage,
      messageType: 'FILE',
      fileUrl: 'https://res.cloudinary.com/demo/raw/upload/doc.pdf',
      content: '',
    }
    render(<MessageBubble message={fileMsg} isMine={false} />)
    expect(screen.getByText('📎 Download file')).toBeInTheDocument()
  })

  // ── Edit/delete actions ───────────────────────────────────────────────────

  it('does not show edit/delete buttons when not mine', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(<MessageBubble message={baseMessage} isMine={false} onEdit={onEdit} onDelete={onDelete} />)
    // hover the bubble
    await userEvent.hover(screen.getByTestId('message-bubble'))
    expect(screen.queryByTestId('edit-message-btn')).not.toBeInTheDocument()
    expect(screen.queryByTestId('delete-message-btn')).not.toBeInTheDocument()
  })

  it('shows edit/delete buttons on hover for own messages', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const { container } = render(
      <MessageBubble message={baseMessage} isMine onEdit={onEdit} onDelete={onDelete} />
    )
    await userEvent.hover(container.firstChild as Element)
    expect(screen.getByTestId('edit-message-btn')).toBeInTheDocument()
    expect(screen.getByTestId('delete-message-btn')).toBeInTheDocument()
  })

  it('calls onDelete when delete button clicked', async () => {
    const onDelete = vi.fn()
    const { container } = render(
      <MessageBubble message={baseMessage} isMine onDelete={onDelete} />
    )
    await userEvent.hover(container.firstChild as Element)
    await userEvent.click(screen.getByTestId('delete-message-btn'))
    expect(onDelete).toHaveBeenCalledWith('msg-1')
  })

  it('enters edit mode when edit button clicked', async () => {
    const { container } = render(
      <MessageBubble message={baseMessage} isMine onEdit={vi.fn()} />
    )
    await userEvent.hover(container.firstChild as Element)
    await userEvent.click(screen.getByTestId('edit-message-btn'))
    expect(screen.getByTestId('edit-message-input')).toBeInTheDocument()
  })

  it('calls onEdit with new content on Enter in edit mode', async () => {
    const onEdit = vi.fn()
    const { container } = render(
      <MessageBubble message={baseMessage} isMine onEdit={onEdit} />
    )
    await userEvent.hover(container.firstChild as Element)
    await userEvent.click(screen.getByTestId('edit-message-btn'))
    const textarea = screen.getByTestId('edit-message-input')
    await userEvent.clear(textarea)
    await userEvent.type(textarea, 'New content{Enter}')
    expect(onEdit).toHaveBeenCalledWith('msg-1', 'New content')
  })

  it('cancels edit on Escape', async () => {
    const onEdit = vi.fn()
    const { container } = render(
      <MessageBubble message={baseMessage} isMine onEdit={onEdit} />
    )
    await userEvent.hover(container.firstChild as Element)
    await userEvent.click(screen.getByTestId('edit-message-btn'))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByTestId('edit-message-input')).not.toBeInTheDocument()
    expect(onEdit).not.toHaveBeenCalled()
  })

  // ── Edited/deleted display ────────────────────────────────────────────────

  it('shows "edited" label for edited messages', () => {
    render(<MessageBubble message={{ ...baseMessage, edited: true }} isMine />)
    expect(screen.getByText('edited')).toBeInTheDocument()
  })

  it('does not show "edited" label for non-edited messages', () => {
    render(<MessageBubble message={baseMessage} isMine />)
    expect(screen.queryByText('edited')).not.toBeInTheDocument()
  })

  it('renders deleted message in italic with gray background', () => {
    render(
      <MessageBubble
        message={{ ...baseMessage, content: '[This message was deleted]', deleted: true }}
        isMine
      />
    )
    const bubble = screen.getByTestId('message-bubble')
    expect(bubble).toHaveClass('bg-white/60')
    expect(screen.getByText('[This message was deleted]')).toHaveClass('italic')
  })

  it('does not show edit/delete on deleted messages', async () => {
    const { container } = render(
      <MessageBubble
        message={{ ...baseMessage, content: '[This message was deleted]', deleted: true }}
        isMine
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    await userEvent.hover(container.firstChild as Element)
    expect(screen.queryByTestId('edit-message-btn')).not.toBeInTheDocument()
  })

  // ── Emoji reactions ───────────────────────────────────────────────────────

  it('shows react button on hover for own messages', async () => {
    const { container } = render(
      <MessageBubble message={baseMessage} isMine onReact={vi.fn()} />
    )
    await userEvent.hover(container.firstChild as Element)
    expect(screen.getByTestId('react-btn')).toBeInTheDocument()
  })

  it('shows react button on hover for others messages', async () => {
    const { container } = render(
      <MessageBubble message={baseMessage} isMine={false} onReact={vi.fn()} />
    )
    await userEvent.hover(container.firstChild as Element)
    expect(screen.getByTestId('react-btn')).toBeInTheDocument()
  })

  it('opens emoji picker when react button is clicked', async () => {
    const { container } = render(
      <MessageBubble message={baseMessage} isMine onReact={vi.fn()} />
    )
    await userEvent.hover(container.firstChild as Element)
    await userEvent.click(screen.getByTestId('react-btn'))
    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument()
  })

  it('calls onReact with messageId and emoji when emoji is selected', async () => {
    const onReact = vi.fn()
    const { container } = render(
      <MessageBubble message={baseMessage} isMine onReact={onReact} />
    )
    await userEvent.hover(container.firstChild as Element)
    await userEvent.click(screen.getByTestId('react-btn'))
    await userEvent.click(screen.getByTestId('emoji-option-👍'))
    expect(onReact).toHaveBeenCalledWith('msg-1', '👍')
  })

  it('closes emoji picker after selecting an emoji', async () => {
    const { container } = render(
      <MessageBubble message={baseMessage} isMine onReact={vi.fn()} />
    )
    await userEvent.hover(container.firstChild as Element)
    await userEvent.click(screen.getByTestId('react-btn'))
    await userEvent.click(screen.getByTestId('emoji-option-❤️'))
    expect(screen.queryByTestId('emoji-picker')).not.toBeInTheDocument()
  })

  it('shows reaction pills when message has reactions', () => {
    const messageWithReactions = {
      ...baseMessage,
      reactions: { '👍': ['bob', 'charlie'], '❤️': ['alice'] },
    }
    render(<MessageBubble message={messageWithReactions} isMine currentUsername="alice" />)
    expect(screen.getByTestId('reaction-pills')).toBeInTheDocument()
    expect(screen.getByTestId('reaction-pill-👍')).toHaveTextContent('2')
    expect(screen.getByTestId('reaction-pill-❤️')).toHaveTextContent('1')
  })

  it('does not show reaction pills when no reactions exist', () => {
    render(<MessageBubble message={baseMessage} isMine />)
    expect(screen.queryByTestId('reaction-pills')).not.toBeInTheDocument()
  })

  it('calls onReact when a reaction pill is clicked', async () => {
    const onReact = vi.fn()
    const messageWithReactions = {
      ...baseMessage,
      reactions: { '👍': ['bob'] },
    }
    render(<MessageBubble message={messageWithReactions} isMine onReact={onReact} />)
    await userEvent.click(screen.getByTestId('reaction-pill-👍'))
    expect(onReact).toHaveBeenCalledWith('msg-1', '👍')
  })

  it('highlights reaction pill when current user has reacted', () => {
    const messageWithReactions = {
      ...baseMessage,
      reactions: { '👍': ['alice', 'bob'] },
    }
    render(<MessageBubble message={messageWithReactions} isMine currentUsername="alice" />)
    expect(screen.getByTestId('reaction-pill-👍')).toHaveClass('bg-emerald-100')
  })

  it('does not highlight reaction pill when current user has not reacted', () => {
    const messageWithReactions = {
      ...baseMessage,
      reactions: { '👍': ['bob'] },
    }
    render(<MessageBubble message={messageWithReactions} isMine currentUsername="alice" />)
    expect(screen.getByTestId('reaction-pill-👍')).not.toHaveClass('bg-green-100')
  })
})
