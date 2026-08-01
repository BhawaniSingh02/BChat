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
