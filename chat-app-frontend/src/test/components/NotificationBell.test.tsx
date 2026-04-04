import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import NotificationBell from '../../components/ui/NotificationBell'
import type { NotificationItem } from '../../components/ui/NotificationBell'
import type { Message } from '../../types'

const makeMsg = (id: string, content: string): Message => ({
  id,
  roomId: 'general',
  sender: 'alice',
  senderName: 'Alice',
  content,
  messageType: 'TEXT',
  readBy: [],
  timestamp: '2025-01-01T10:00:00Z',
})

const makeNotification = (id: string, read = false): NotificationItem => ({
  id,
  message: makeMsg(id, `Notification ${id}`),
  conversationLabel: '#general',
  read,
  at: '2025-01-01T10:00:00Z',
})

describe('NotificationBell', () => {
  it('renders bell button', () => {
    render(
      <NotificationBell
        notifications={[]}
        onMarkAllRead={vi.fn()}
        onClickNotification={vi.fn()}
      />,
    )
    expect(screen.getByTestId('notification-bell-btn')).toBeDefined()
  })

  it('shows unread badge when there are unread notifications', () => {
    render(
      <NotificationBell
        notifications={[makeNotification('1', false), makeNotification('2', true)]}
        onMarkAllRead={vi.fn()}
        onClickNotification={vi.fn()}
      />,
    )
    expect(screen.getByTestId('notification-badge').textContent).toBe('1')
  })

  it('does not show badge when all read', () => {
    render(
      <NotificationBell
        notifications={[makeNotification('1', true)]}
        onMarkAllRead={vi.fn()}
        onClickNotification={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('notification-badge')).toBeNull()
  })

  it('does not show badge when no notifications', () => {
    render(
      <NotificationBell notifications={[]} onMarkAllRead={vi.fn()} onClickNotification={vi.fn()} />,
    )
    expect(screen.queryByTestId('notification-badge')).toBeNull()
  })

  it('opens panel when bell is clicked', () => {
    render(
      <NotificationBell
        notifications={[makeNotification('1', false)]}
        onMarkAllRead={vi.fn()}
        onClickNotification={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByTestId('notification-bell-btn'))
    expect(screen.getByTestId('notification-panel')).toBeDefined()
  })

  it('shows empty state when no notifications', () => {
    render(
      <NotificationBell notifications={[]} onMarkAllRead={vi.fn()} onClickNotification={vi.fn()} />,
    )
    fireEvent.click(screen.getByTestId('notification-bell-btn'))
    expect(screen.getByTestId('no-notifications')).toBeDefined()
  })

  it('shows notification items', () => {
    render(
      <NotificationBell
        notifications={[makeNotification('1'), makeNotification('2')]}
        onMarkAllRead={vi.fn()}
        onClickNotification={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByTestId('notification-bell-btn'))
    expect(screen.getAllByTestId('notification-item').length).toBe(2)
  })

  it('calls onMarkAllRead when mark-all-read button is clicked', () => {
    const onMarkAllRead = vi.fn()
    render(
      <NotificationBell
        notifications={[makeNotification('1', false)]}
        onMarkAllRead={onMarkAllRead}
        onClickNotification={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByTestId('notification-bell-btn'))
    fireEvent.click(screen.getByTestId('mark-all-read-btn'))
    expect(onMarkAllRead).toHaveBeenCalledOnce()
  })

  it('calls onClickNotification when a notification is clicked', () => {
    const onClickNotification = vi.fn()
    const notif = makeNotification('1', false)
    render(
      <NotificationBell
        notifications={[notif]}
        onMarkAllRead={vi.fn()}
        onClickNotification={onClickNotification}
      />,
    )
    fireEvent.click(screen.getByTestId('notification-bell-btn'))
    fireEvent.click(screen.getAllByTestId('notification-item')[0])
    expect(onClickNotification).toHaveBeenCalledWith(notif)
  })

  it('shows 99+ for very high unread counts', () => {
    const notifications = Array.from({ length: 105 }, (_, i) => makeNotification(String(i), false))
    render(
      <NotificationBell
        notifications={notifications}
        onMarkAllRead={vi.fn()}
        onClickNotification={vi.fn()}
      />,
    )
    expect(screen.getByTestId('notification-badge').textContent).toBe('99+')
  })
})
