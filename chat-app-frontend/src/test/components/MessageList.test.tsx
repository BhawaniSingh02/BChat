import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import MessageList from '../../components/chat/MessageList'
import type { Message } from '../../types'

vi.mock('../../store/userCacheStore', () => ({
  useUserCacheStore: (selector: (s: any) => any) => selector({ prefetch: vi.fn() }),
}))

const makeMessage = (id: string, sender = 'alice'): Message => ({
  id,
  roomId: 'general',
  sender,
  senderName: sender,
  content: `Message ${id}`,
  messageType: 'TEXT',
  readBy: [],
  timestamp: `2026-03-28T10:0${id}:00`,
})

// jsdom has no IntersectionObserver — provide a controllable mock that captures
// the callback so tests can simulate the sentinel scrolling into view.
let ioCallback: ((entries: { isIntersecting: boolean }[]) => void) | null = null
class MockIntersectionObserver {
  constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
    ioCallback = cb
  }
  observe() {}
  disconnect() {}
}

describe('MessageList', () => {
  beforeEach(() => {
    ioCallback = null
    ;(globalThis as any).IntersectionObserver = MockIntersectionObserver
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  it('renders messages', () => {
    render(<MessageList messages={[makeMessage('1')]} currentUsername="alice" typingUsers={[]} />)
    expect(screen.getByTestId('message-list')).toBeInTheDocument()
  })

  it('triggers onLoadOlder when the top sentinel intersects and more exist', () => {
    const onLoadOlder = vi.fn()
    render(
      <MessageList
        messages={[makeMessage('1')]}
        currentUsername="alice"
        typingUsers={[]}
        hasMoreOlder
        onLoadOlder={onLoadOlder}
      />,
    )
    expect(ioCallback).not.toBeNull()
    ioCallback!([{ isIntersecting: true }])
    expect(onLoadOlder).toHaveBeenCalledTimes(1)
  })

  it('does not trigger onLoadOlder while already loading', () => {
    const onLoadOlder = vi.fn()
    render(
      <MessageList
        messages={[makeMessage('1')]}
        currentUsername="alice"
        typingUsers={[]}
        hasMoreOlder
        isLoadingOlder
        onLoadOlder={onLoadOlder}
      />,
    )
    ioCallback!([{ isIntersecting: true }])
    expect(onLoadOlder).not.toHaveBeenCalled()
  })

  it('shows the loading-older indicator when isLoadingOlder is true', () => {
    render(
      <MessageList
        messages={[makeMessage('1')]}
        currentUsername="alice"
        typingUsers={[]}
        hasMoreOlder
        isLoadingOlder
      />,
    )
    expect(screen.getByTestId('loading-older-indicator')).toBeInTheDocument()
  })

  it('scrolls to bottom when a new message is appended', () => {
    const { rerender } = render(
      <MessageList messages={[makeMessage('1')]} currentUsername="alice" typingUsers={[]} />,
    )
    vi.mocked(window.HTMLElement.prototype.scrollIntoView).mockClear()
    rerender(
      <MessageList messages={[makeMessage('1'), makeMessage('2')]} currentUsername="alice" typingUsers={[]} />,
    )
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
  })

  it('does not scroll to bottom when older messages are prepended', () => {
    const { rerender } = render(
      <MessageList messages={[makeMessage('2')]} currentUsername="alice" typingUsers={[]} />,
    )
    vi.mocked(window.HTMLElement.prototype.scrollIntoView).mockClear()
    rerender(
      <MessageList messages={[makeMessage('1'), makeMessage('2')]} currentUsername="alice" typingUsers={[]} />,
    )
    expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled()
  })

  describe('consecutive-image grouping', () => {
    const makeImage = (id: string, minutesOffset: number): Message => ({
      id,
      roomId: 'general',
      sender: 'alice',
      senderName: 'alice',
      content: '', // MessageInput sends empty content for an uncaptioned image — the exact "no caption" signal
      messageType: 'IMAGE',
      fileUrl: `https://res.cloudinary.com/demo/image/upload/photo${id}.jpg`,
      readBy: [],
      timestamp: new Date(new Date('2026-03-28T10:00:00Z').getTime() + minutesOffset * 60_000).toISOString(),
    })

    it('renders a compact media grid instead of separate bubbles for a burst of images', () => {
      const messages = [makeImage('1', 0), makeImage('2', 1), makeImage('3', 2)]
      render(<MessageList messages={messages} currentUsername="alice" typingUsers={[]} />)
      expect(screen.getByTestId('media-grid')).toBeInTheDocument()
      expect(screen.getAllByTestId('media-grid-tile')).toHaveLength(3)
      expect(screen.queryByTestId('message-bubble')).not.toBeInTheDocument()
    })

    it('renders a lone image as a normal message bubble, not a grid', () => {
      const messages = [makeImage('1', 0)]
      render(<MessageList messages={messages} currentUsername="alice" typingUsers={[]} />)
      expect(screen.getByTestId('message-bubble')).toBeInTheDocument()
      expect(screen.queryByTestId('media-grid')).not.toBeInTheDocument()
    })

    it('gives every tile a msg-{id} DOM anchor, including non-first tiles, so reply-quote/pinned/search jumps can still find a grouped image', () => {
      const messages = [makeImage('1', 0), makeImage('2', 1), makeImage('3', 2), makeImage('4', 3)]
      render(<MessageList messages={messages} currentUsername="alice" typingUsers={[]} />)
      // The regression: MediaGrid tiles previously had no id at all, so
      // document.getElementById('msg-${id}') — what reply-quote taps, pinned-message taps, and
      // search-result jumps all use to scroll — silently returned null for every grouped image.
      expect(document.getElementById('msg-1')).not.toBeNull()
      expect(document.getElementById('msg-2')).not.toBeNull()
      expect(document.getElementById('msg-3')).not.toBeNull()
      expect(document.getElementById('msg-4')).not.toBeNull()
    })
  })

  describe('virtualization threshold', () => {
    const manyMessages = (count: number): Message[] =>
      Array.from({ length: count }, (_, i) => ({
        id: String(i),
        roomId: 'general',
        sender: 'alice',
        senderName: 'alice',
        content: `Message ${i}`,
        messageType: 'TEXT',
        readBy: [],
        timestamp: new Date(2026, 2, 28, 10, 0, i).toISOString(),
      }))

    it('renders the plain list at or below the threshold', () => {
      render(<MessageList messages={manyMessages(100)} currentUsername="alice" typingUsers={[]} />)
      expect(screen.getByTestId('message-list')).toHaveAttribute('data-list-variant', 'plain')
    })

    it('renders the virtualized list above the threshold', () => {
      render(<MessageList messages={manyMessages(101)} currentUsername="alice" typingUsers={[]} />)
      expect(screen.getByTestId('message-list')).toHaveAttribute('data-list-variant', 'virtualized')
    })
  })
})
