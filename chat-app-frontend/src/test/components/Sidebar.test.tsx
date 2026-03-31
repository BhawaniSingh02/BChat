import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Room, DirectConversation } from '../../types'

// Hoisted so vi.mock factories can close over them
const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  setActiveRoom: vi.fn(),
  setActiveDM: vi.fn(),
  getOrCreate: vi.fn(),
  joinRoom: vi.fn(),
  rooms: { my: [] as Room[], all: [] as Room[] },
  conversations: [] as DirectConversation[],
}))

vi.mock('../../store/authStore', () => ({
  useAuthStore: (selector?: (s: any) => any) => {
    const state = { user: { username: 'alice', email: 'alice@test.com', id: '1' }, logout: mocks.logout }
    return selector ? selector(state) : state
  },
}))

vi.mock('../../store/roomStore', () => ({
  useRoomStore: (selector?: (s: any) => any) => {
    const state = {
      myRooms: mocks.rooms.my,
      rooms: mocks.rooms.all,
      activeRoomId: null,
      setActiveRoom: mocks.setActiveRoom,
      joinRoom: mocks.joinRoom,
    }
    return selector ? selector(state) : state
  },
}))

vi.mock('../../store/dmStore', () => ({
  useDMStore: (selector?: (s: any) => any) => {
    const state = {
      conversations: mocks.conversations,
      activeDMId: null,
      setActiveDM: mocks.setActiveDM,
      getOrCreateConversation: mocks.getOrCreate,
      dmUnreadCounts: {},
    }
    return selector ? selector(state) : state
  },
}))

vi.mock('../../store/presenceStore', () => ({
  usePresenceStore: (selector: (s: any) => any) => selector({ isOnline: () => false }),
}))

import Sidebar from '../../components/layout/Sidebar'

const _makeRoom = (id: string): Room => ({
  id, roomId: id, name: `Room ${id}`, description: '', createdBy: 'alice',
  members: ['alice'], memberCount: 1, createdAt: '2026-03-28T10:00:00',
})

const makeConv = (id: string): DirectConversation => ({
  id, participants: ['alice', 'bob'], createdAt: '2026-03-28T10:00:00',
})

describe('Sidebar', () => {
  beforeEach(() => {
    mocks.rooms.my = []
    mocks.rooms.all = []
    mocks.conversations = []
    vi.clearAllMocks()
  })

  it('renders BChat brand name', () => {
    render(<Sidebar />)
    expect(screen.getByText('BChat')).toBeInTheDocument()
  })

  it('renders logged-in user info', () => {
    render(<Sidebar />)
    expect(screen.getAllByText('alice').length).toBeGreaterThan(0)
    expect(screen.getAllByText('alice@test.com').length).toBeGreaterThan(0)
  })

  it('shows Rooms tab active by default', () => {
    render(<Sidebar />)
    expect(screen.getByRole('button', { name: 'Rooms' })).toHaveClass('text-green-600')
  })

  it('switches to DMs tab on click', async () => {
    render(<Sidebar />)
    await userEvent.click(screen.getByRole('button', { name: /Messages/ }))
    expect(screen.getByRole('button', { name: /Messages/ })).toHaveClass('text-green-600')
  })

  it('shows conversation count on DMs tab', () => {
    mocks.conversations = [makeConv('c1'), makeConv('c2')]
    render(<Sidebar />)
    expect(screen.getByText(/Messages \(2\)/)).toBeInTheDocument()
  })

  it('shows empty DM state with start message button', async () => {
    render(<Sidebar />)
    await userEvent.click(screen.getByRole('button', { name: /Messages/ }))
    expect(screen.getByText('No conversations yet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start a new message' })).toBeInTheDocument()
  })

  it('renders DM conversation cards when conversations exist', async () => {
    mocks.conversations = [makeConv('c1')]
    render(<Sidebar />)
    await userEvent.click(screen.getByRole('button', { name: /Messages/ }))
    expect(screen.getByTestId('dm-card')).toBeInTheDocument()
  })

  it('shows + New Message button in DMs tab', async () => {
    mocks.conversations = [makeConv('c1')]
    render(<Sidebar />)
    await userEvent.click(screen.getByRole('button', { name: /Messages/ }))
    expect(screen.getByRole('button', { name: '+ New Message' })).toBeInTheDocument()
  })

  it('calls logout when logout button clicked', async () => {
    render(<Sidebar />)
    await userEvent.click(screen.getByLabelText('Logout'))
    expect(mocks.logout).toHaveBeenCalledOnce()
  })

  it('calls setActiveDM and setActiveRoom(null) when DM card is clicked', async () => {
    mocks.conversations = [makeConv('c1')]
    render(<Sidebar />)
    await userEvent.click(screen.getByRole('button', { name: /Messages/ }))
    await userEvent.click(screen.getByTestId('dm-card'))
    expect(mocks.setActiveDM).toHaveBeenCalledWith('c1')
    expect(mocks.setActiveRoom).toHaveBeenCalledWith(null)
  })
})
