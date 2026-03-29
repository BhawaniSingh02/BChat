import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RoomCard from '../../components/rooms/RoomCard'
import type { Room } from '../../types'

const mockRoom: Room = {
  id: 'room-1',
  roomId: 'general',
  name: 'General',
  description: 'General discussion',
  createdBy: 'alice',
  members: ['alice', 'bob'],
  memberCount: 2,
  createdAt: '2026-03-28T10:00:00',
  lastMessageAt: '2026-03-28T11:00:00',
}

describe('RoomCard', () => {
  it('renders room name', () => {
    render(<RoomCard room={mockRoom} />)
    expect(screen.getByText('General')).toBeInTheDocument()
  })

  it('renders member count', () => {
    render(<RoomCard room={mockRoom} />)
    expect(screen.getByText('2 members')).toBeInTheDocument()
  })

  it('renders description', () => {
    render(<RoomCard room={mockRoom} />)
    expect(screen.getByText('General discussion')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<RoomCard room={mockRoom} onClick={onClick} />)
    await userEvent.click(screen.getByTestId('room-card'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('sets aria-current when active', () => {
    render(<RoomCard room={mockRoom} active />)
    expect(screen.getByTestId('room-card')).toHaveAttribute('aria-current', 'page')
  })

  it('does not set aria-current when inactive', () => {
    render(<RoomCard room={mockRoom} active={false} />)
    expect(screen.getByTestId('room-card')).not.toHaveAttribute('aria-current')
  })

  it('shows unread badge when unreadCount is provided', () => {
    render(<RoomCard room={mockRoom} unreadCount={5} />)
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('5')
  })

  it('shows 99+ for counts over 99', () => {
    render(<RoomCard room={mockRoom} unreadCount={150} />)
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('99+')
  })

  it('does not show badge when unreadCount is 0', () => {
    render(<RoomCard room={mockRoom} unreadCount={0} />)
    expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument()
  })

  it('does not show badge when unreadCount is undefined', () => {
    render(<RoomCard room={mockRoom} />)
    expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument()
  })
})
