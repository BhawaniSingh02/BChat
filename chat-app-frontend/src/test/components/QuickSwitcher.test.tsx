import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Room, DirectConversation } from '../../types'

vi.mock('../../store/presenceStore', () => ({
  usePresenceStore: (selector: (s: any) => any) =>
    selector({ isOnline: () => false }),
}))

import QuickSwitcher from '../../components/ui/QuickSwitcher'

const makeRoom = (id: string, name: string): Room => ({
  id, roomId: id, name, description: '', createdBy: 'alice',
  members: ['alice'], memberCount: 1, createdAt: '2026-01-01T00:00:00',
})

const makeConv = (id: string, other: string): DirectConversation => ({
  id, participants: ['alice', other], createdAt: '2026-01-01T00:00:00',
})

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  rooms: [makeRoom('general', 'General'), makeRoom('random', 'Random')],
  conversations: [makeConv('dm1', 'bob')],
  currentUsername: 'alice',
  onSelectRoom: vi.fn(),
  onSelectDM: vi.fn(),
  activeRoomId: null,
  activeDMId: null,
}

describe('QuickSwitcher', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders nothing when closed', () => {
    render(<QuickSwitcher {...defaultProps} open={false} />)
    expect(screen.queryByTestId('quick-switcher')).not.toBeInTheDocument()
  })

  it('renders when open', () => {
    render(<QuickSwitcher {...defaultProps} />)
    expect(screen.getByTestId('quick-switcher')).toBeInTheDocument()
  })

  it('shows all rooms and DMs', () => {
    render(<QuickSwitcher {...defaultProps} />)
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText('Random')).toBeInTheDocument()
    expect(screen.getByText('bob')).toBeInTheDocument()
  })

  it('filters results by query', async () => {
    render(<QuickSwitcher {...defaultProps} />)
    await userEvent.type(screen.getByTestId('quick-switcher-input'), 'gen')
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.queryByText('Random')).not.toBeInTheDocument()
  })

  it('calls onSelectRoom when room is clicked', async () => {
    const onSelectRoom = vi.fn()
    render(<QuickSwitcher {...defaultProps} onSelectRoom={onSelectRoom} />)
    const items = screen.getAllByTestId('quick-switcher-item')
    await userEvent.click(items[0])
    expect(onSelectRoom).toHaveBeenCalledWith('general')
  })

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn()
    render(<QuickSwitcher {...defaultProps} onClose={onClose} />)
    await userEvent.click(screen.getByTestId('quick-switcher-backdrop'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows no results message when query has no matches', async () => {
    render(<QuickSwitcher {...defaultProps} />)
    await userEvent.type(screen.getByTestId('quick-switcher-input'), 'xyznotfound')
    expect(screen.getByText(/No results/)).toBeInTheDocument()
  })
})
