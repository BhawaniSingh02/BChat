import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
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
    render(<MessageBubble message={baseMessage} isMine />)
    expect(screen.getByTestId('message-row')).toHaveClass('justify-end')
  })

  it('aligns to left for others messages', () => {
    render(<MessageBubble message={baseMessage} isMine={false} />)
    expect(screen.getByTestId('message-row')).toHaveClass('justify-start')
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

  // ── Edit mode (triggered by isEditing prop) ────────────────────────────────

  it('does not show edit input by default', () => {
    render(<MessageBubble message={baseMessage} isMine onEdit={vi.fn()} />)
    expect(screen.queryByTestId('edit-message-input')).not.toBeInTheDocument()
  })

  it('shows edit textarea when isEditing=true', () => {
    render(<MessageBubble message={baseMessage} isMine onEdit={vi.fn()} isEditing />)
    expect(screen.getByTestId('edit-message-input')).toBeInTheDocument()
  })

  it('calls onEdit with new content on Enter in edit mode', async () => {
    const onEdit = vi.fn()
    render(<MessageBubble message={baseMessage} isMine onEdit={onEdit} isEditing />)
    const textarea = screen.getByTestId('edit-message-input')
    await userEvent.clear(textarea)
    await userEvent.type(textarea, 'New content{Enter}')
    expect(onEdit).toHaveBeenCalledWith('msg-1', 'New content')
  })

  it('cancels edit on Escape without calling onEdit', async () => {
    const onEdit = vi.fn()
    render(<MessageBubble message={baseMessage} isMine onEdit={onEdit} isEditing />)
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

  it('does not show react button in selectionMode', async () => {
    const { container } = render(
      <MessageBubble message={baseMessage} isMine onReact={vi.fn()} selectionMode />
    )
    await userEvent.hover(container.firstChild as Element)
    expect(screen.queryByTestId('react-btn')).not.toBeInTheDocument()
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
    expect(screen.getByTestId('reaction-pill-👍')).not.toHaveClass('bg-emerald-100')
  })

  // ── WhatsApp-style selection ───────────────────────────────────────────────

  it('does not show selection checkbox by default', () => {
    render(<MessageBubble message={baseMessage} isMine />)
    expect(screen.queryByTestId('selection-checkbox')).not.toBeInTheDocument()
  })

  it('shows selection checkbox when selectionMode=true', () => {
    render(<MessageBubble message={baseMessage} isMine selectionMode />)
    expect(screen.getByTestId('selection-checkbox')).toBeInTheDocument()
  })

  it('checkbox appears filled when isSelected=true', () => {
    render(<MessageBubble message={baseMessage} isMine selectionMode isSelected />)
    const checkbox = screen.getByTestId('selection-checkbox')
    expect(checkbox).toHaveClass('bg-[#075e54]')
  })

  it('checkbox appears hollow when isSelected=false in selectionMode', () => {
    render(<MessageBubble message={baseMessage} isMine selectionMode isSelected={false} />)
    const checkbox = screen.getByTestId('selection-checkbox')
    expect(checkbox).not.toHaveClass('bg-[#075e54]')
  })

  it('calls onSelect when message is clicked in selectionMode', async () => {
    const onSelect = vi.fn()
    const { container } = render(
      <MessageBubble message={baseMessage} isMine selectionMode onSelect={onSelect} />
    )
    await userEvent.click(container.firstChild as Element)
    expect(onSelect).toHaveBeenCalledWith('msg-1')
  })

  it('adds selected highlight when isSelected=true', () => {
    const { container } = render(
      <MessageBubble message={baseMessage} isMine selectionMode isSelected />
    )
    expect(container.firstChild).toHaveClass('bg-emerald-50')
  })

  it('does not add selected highlight when isSelected=false', () => {
    const { container } = render(
      <MessageBubble message={baseMessage} isMine selectionMode isSelected={false} />
    )
    expect(container.firstChild).not.toHaveClass('bg-emerald-50')
  })

  it('calls onEnterSelectionMode after long press', async () => {
    vi.useFakeTimers()
    const onEnterSelectionMode = vi.fn()
    const { container } = render(
      <MessageBubble message={baseMessage} isMine onEnterSelectionMode={onEnterSelectionMode} />
    )
    // Simulate mousedown without mouseup (long press)
    const outer = container.firstChild as Element
    outer.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    act(() => { vi.advanceTimersByTime(600) })
    expect(onEnterSelectionMode).toHaveBeenCalledWith(baseMessage)
    vi.useRealTimers()
  })

  // ── Phase 18: Quote reply ─────────────────────────────────────────────────

  it('shows quoted reply bubble when message has replyToId', () => {
    const msg = {
      ...baseMessage,
      replyToId: 'original-msg',
      replyToSnippet: 'Original message content',
      replyToSender: 'charlie',
    }
    render(<MessageBubble message={msg} isMine />)
    expect(screen.getByTestId('reply-quote')).toBeInTheDocument()
    expect(screen.getByText('Original message content')).toBeInTheDocument()
    expect(screen.getByText('charlie')).toBeInTheDocument()
  })

  it('does not show reply quote when no replyToId', () => {
    render(<MessageBubble message={baseMessage} isMine />)
    expect(screen.queryByTestId('reply-quote')).not.toBeInTheDocument()
  })

  it('calls onScrollToMessage when reply quote is clicked', async () => {
    const onScroll = vi.fn()
    const msg = {
      ...baseMessage,
      replyToId: 'original-msg',
      replyToSnippet: 'Original',
      replyToSender: 'charlie',
    }
    render(<MessageBubble message={msg} isMine onScrollToMessage={onScroll} />)
    await userEvent.click(screen.getByTestId('reply-quote'))
    expect(onScroll).toHaveBeenCalledWith('original-msg')
  })

  // ── Phase 18: Forwarded label ─────────────────────────────────────────────

  it('shows forwarded label when message has forwardedFrom', () => {
    const msg = { ...baseMessage, forwardedFrom: 'dave' }
    render(<MessageBubble message={msg} isMine />)
    expect(screen.getByTestId('forwarded-label')).toBeInTheDocument()
    expect(screen.getByText(/Forwarded from/)).toBeInTheDocument()
    expect(screen.getByText('dave')).toBeInTheDocument()
  })

  it('does not show forwarded label when message is original', () => {
    render(<MessageBubble message={baseMessage} isMine />)
    expect(screen.queryByTestId('forwarded-label')).not.toBeInTheDocument()
  })

  // ── Desktop dropdown ─────────────────────────────────────────────────────

  it('does not show dropdown trigger by default (not hovered)', () => {
    render(<MessageBubble message={baseMessage} isMine onDropdownAction={vi.fn()} />)
    expect(screen.queryByTestId('message-dropdown-trigger')).not.toBeInTheDocument()
  })

  it('shows dropdown trigger on hover when onDropdownAction provided', async () => {
    const { container } = render(
      <MessageBubble message={baseMessage} isMine onDropdownAction={vi.fn()} />
    )
    await userEvent.hover(container.firstChild as Element)
    expect(screen.getByTestId('message-dropdown-trigger')).toBeInTheDocument()
  })

  it('opens dropdown menu when trigger is clicked', async () => {
    const { container } = render(
      <MessageBubble message={baseMessage} isMine onDropdownAction={vi.fn()} />
    )
    await userEvent.hover(container.firstChild as Element)
    await userEvent.click(screen.getByTestId('message-dropdown-trigger'))
    expect(screen.getByTestId('message-dropdown')).toBeInTheDocument()
  })

  it('calls onDropdownAction with "reply" when Reply is clicked', async () => {
    const onDropdownAction = vi.fn()
    const { container } = render(
      <MessageBubble message={baseMessage} isMine onDropdownAction={onDropdownAction} />
    )
    await userEvent.hover(container.firstChild as Element)
    await userEvent.click(screen.getByTestId('message-dropdown-trigger'))
    await userEvent.click(screen.getByTestId('dropdown-reply'))
    expect(onDropdownAction).toHaveBeenCalledWith('reply', baseMessage)
  })

  it('calls onDropdownAction with "forward" when Forward is clicked', async () => {
    const onDropdownAction = vi.fn()
    const { container } = render(
      <MessageBubble message={baseMessage} isMine onDropdownAction={onDropdownAction} />
    )
    await userEvent.hover(container.firstChild as Element)
    await userEvent.click(screen.getByTestId('message-dropdown-trigger'))
    await userEvent.click(screen.getByTestId('dropdown-forward'))
    expect(onDropdownAction).toHaveBeenCalledWith('forward', baseMessage)
  })

  it('calls onDropdownAction with "star" when Star is clicked', async () => {
    const onDropdownAction = vi.fn()
    const { container } = render(
      <MessageBubble message={baseMessage} isMine onDropdownAction={onDropdownAction} />
    )
    await userEvent.hover(container.firstChild as Element)
    await userEvent.click(screen.getByTestId('message-dropdown-trigger'))
    await userEvent.click(screen.getByTestId('dropdown-star'))
    expect(onDropdownAction).toHaveBeenCalledWith('star', baseMessage)
  })

  it('calls onDropdownAction with "delete" when Delete is clicked (own message)', async () => {
    const onDropdownAction = vi.fn()
    const { container } = render(
      <MessageBubble message={baseMessage} isMine onDropdownAction={onDropdownAction} />
    )
    await userEvent.hover(container.firstChild as Element)
    await userEvent.click(screen.getByTestId('message-dropdown-trigger'))
    await userEvent.click(screen.getByTestId('dropdown-delete'))
    expect(onDropdownAction).toHaveBeenCalledWith('delete', baseMessage)
  })

  it('does not show Delete option for others messages', async () => {
    const { container } = render(
      <MessageBubble message={baseMessage} isMine={false} onDropdownAction={vi.fn()} />
    )
    await userEvent.hover(container.firstChild as Element)
    await userEvent.click(screen.getByTestId('message-dropdown-trigger'))
    expect(screen.queryByTestId('dropdown-delete')).not.toBeInTheDocument()
  })

  it('shows Pin option for admin users', async () => {
    const { container } = render(
      <MessageBubble message={baseMessage} isMine onDropdownAction={vi.fn()} isAdmin />
    )
    await userEvent.hover(container.firstChild as Element)
    await userEvent.click(screen.getByTestId('message-dropdown-trigger'))
    expect(screen.getByTestId('dropdown-pin')).toBeInTheDocument()
  })

  it('does not show Pin option for non-admin users', async () => {
    const { container } = render(
      <MessageBubble message={baseMessage} isMine onDropdownAction={vi.fn()} isAdmin={false} />
    )
    await userEvent.hover(container.firstChild as Element)
    await userEvent.click(screen.getByTestId('message-dropdown-trigger'))
    expect(screen.queryByTestId('dropdown-pin')).not.toBeInTheDocument()
  })

  it('shows "Unpin" label when message is already pinned', async () => {
    const { container } = render(
      <MessageBubble message={baseMessage} isMine onDropdownAction={vi.fn()} isAdmin isPinned />
    )
    await userEvent.hover(container.firstChild as Element)
    await userEvent.click(screen.getByTestId('message-dropdown-trigger'))
    expect(screen.getByTestId('dropdown-pin')).toHaveTextContent('Unpin')
  })

  it('calls onEnterSelectionMode when Select is clicked from dropdown', async () => {
    const onEnterSelectionMode = vi.fn()
    const { container } = render(
      <MessageBubble message={baseMessage} isMine onDropdownAction={vi.fn()} onEnterSelectionMode={onEnterSelectionMode} />
    )
    await userEvent.hover(container.firstChild as Element)
    await userEvent.click(screen.getByTestId('message-dropdown-trigger'))
    await userEvent.click(screen.getByTestId('dropdown-select'))
    expect(onEnterSelectionMode).toHaveBeenCalledWith(baseMessage)
  })

  it('does not show dropdown trigger in selectionMode', async () => {
    const { container } = render(
      <MessageBubble message={baseMessage} isMine onDropdownAction={vi.fn()} selectionMode />
    )
    await userEvent.hover(container.firstChild as Element)
    expect(screen.queryByTestId('message-dropdown-trigger')).not.toBeInTheDocument()
  })

  it('does not show dropdown trigger when onDropdownAction is not provided', async () => {
    const { container } = render(<MessageBubble message={baseMessage} isMine />)
    await userEvent.hover(container.firstChild as Element)
    expect(screen.queryByTestId('message-dropdown-trigger')).not.toBeInTheDocument()
  })

  // ── Phase 19: Star indicator ──────────────────────────────────────────────

  it('shows star indicator in footer when message is starred by current user', () => {
    const starred = { ...baseMessage, starred: ['alice'] }
    render(<MessageBubble message={starred} isMine currentUsername="alice" />)
    expect(screen.getByTestId('star-indicator')).toBeInTheDocument()
  })

  it('does not show star indicator when message is not starred by current user', () => {
    const notStarred = { ...baseMessage, starred: ['bob'] }
    render(<MessageBubble message={notStarred} isMine currentUsername="alice" />)
    expect(screen.queryByTestId('star-indicator')).not.toBeInTheDocument()
  })
})
