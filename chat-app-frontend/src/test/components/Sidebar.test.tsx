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
  dmUnreadCounts: {} as Record<string, number>,
  updateConversation: vi.fn(),
  removeConversation: vi.fn(),
  requests: [] as DirectConversation[],
}))

vi.mock('../../api/messages', () => ({
  messagesApi: {
    unarchiveDM: vi.fn().mockResolvedValue({
      id: 'c1', participants: ['alice', 'bob'], createdAt: '2026-03-28T10:00:00', archivedBy: [],
    }),
    archiveDM: vi.fn().mockResolvedValue({}),
  },
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
      dmUnreadCounts: mocks.dmUnreadCounts,
      updateConversation: mocks.updateConversation,
      removeConversation: mocks.removeConversation,
      requests: mocks.requests,
      fetchRequests: vi.fn(),
      acceptRequest: vi.fn(),
      declineRequest: vi.fn(),
    }
    return selector ? selector(state) : state
  },
}))

vi.mock('../../store/presenceStore', () => ({
  usePresenceStore: (selector: (s: any) => any) => selector({ isOnline: () => false }),
}))

import Sidebar from '../../components/layout/Sidebar'
import { messagesApi } from '../../api/messages'

const makeConv = (id: string, over: Partial<DirectConversation> = {}): DirectConversation => ({
  id, participants: ['alice', 'bob'], createdAt: '2026-03-28T10:00:00', ...over,
})

describe('Sidebar', () => {
  beforeEach(() => {
    mocks.rooms.my = []
    mocks.rooms.all = []
    mocks.conversations = []
    mocks.dmUnreadCounts = {}
    mocks.requests = []
    vi.clearAllMocks()
  })

  it('renders brand name', () => {
    render(<Sidebar />)
    // BrandLogo renders the wordmark letter-by-letter, exposed to AT via aria-label
    expect(screen.getByLabelText('Baaat')).toBeInTheDocument()
  })

  it('renders logged-in user info', () => {
    render(<Sidebar />)
    expect(screen.getAllByText('alice').length).toBeGreaterThan(0)
    expect(screen.getAllByText('alice@test.com').length).toBeGreaterThan(0)
  })

  it('shows the Messages (DMs) tab active by default', () => {
    render(<Sidebar />)
    expect(screen.getByRole('button', { name: /Messages/ })).toHaveClass('text-teal-700')
  })

  it('switches to the Rooms tab on click', async () => {
    render(<Sidebar />)
    await userEvent.click(screen.getByRole('button', { name: 'Rooms' }))
    expect(screen.getByRole('button', { name: 'Rooms' })).toHaveClass('text-teal-700')
  })

  it('shows the total unread DM count on the Messages tab', () => {
    mocks.conversations = [makeConv('c1'), makeConv('c2')]
    mocks.dmUnreadCounts = { c1: 1, c2: 1 }
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

  it('hides conversations archived by the current user', async () => {
    mocks.conversations = [makeConv('c1', { archivedBy: ['alice'] })]
    render(<Sidebar />)
    await userEvent.click(screen.getByRole('button', { name: /Messages/ }))
    // The archived conversation is filtered out → empty state shown instead
    expect(screen.queryByTestId('dm-card')).not.toBeInTheDocument()
    expect(screen.getByText('No conversations yet.')).toBeInTheDocument()
  })

  it('still shows conversations archived only by the other user', async () => {
    mocks.conversations = [makeConv('c1', { archivedBy: ['bob'] })]
    render(<Sidebar />)
    await userEvent.click(screen.getByRole('button', { name: /Messages/ }))
    expect(screen.getByTestId('dm-card')).toBeInTheDocument()
  })

  it('shows an Archived entry only when there are archived conversations', async () => {
    mocks.conversations = [makeConv('c1')]
    const { unmount } = render(<Sidebar />)
    expect(screen.queryByTestId('archived-row')).not.toBeInTheDocument()
    unmount()

    mocks.conversations = [makeConv('c2', { archivedBy: ['alice'] })]
    render(<Sidebar />)
    expect(screen.getByTestId('archived-row')).toBeInTheDocument()
  })

  it('lists archived chats in the archived modal', async () => {
    mocks.conversations = [makeConv('c1', { archivedBy: ['alice'] })]
    render(<Sidebar />)
    await userEvent.click(screen.getByTestId('archived-row'))
    expect(screen.getByTestId('archived-chat-item')).toBeInTheDocument()
  })

  it('unarchives a chat from the archived modal', async () => {
    mocks.conversations = [makeConv('c1', { archivedBy: ['alice'] })]
    render(<Sidebar />)
    await userEvent.click(screen.getByTestId('archived-row'))
    await userEvent.click(screen.getByTestId('unarchive-chat-btn'))
    expect(messagesApi.unarchiveDM).toHaveBeenCalledWith('c1')
  })

  it('shows + New Message button in DMs tab', async () => {
    mocks.conversations = [makeConv('c1')]
    render(<Sidebar />)
    await userEvent.click(screen.getByRole('button', { name: /Messages/ }))
    expect(screen.getByRole('button', { name: '+ New Message' })).toBeInTheDocument()
  })

  it('shows All/Unread filter chips when conversations exist', async () => {
    mocks.conversations = [makeConv('c1')]
    render(<Sidebar />)
    await userEvent.click(screen.getByRole('button', { name: /Messages/ }))
    expect(screen.getByTestId('dm-filter-all')).toBeInTheDocument()
    expect(screen.getByTestId('dm-filter-unread')).toBeInTheDocument()
  })

  it('does not show filter chips when there are no conversations', async () => {
    render(<Sidebar />)
    await userEvent.click(screen.getByRole('button', { name: /Messages/ }))
    expect(screen.queryByTestId('dm-filter-all')).not.toBeInTheDocument()
  })

  it('filters to only unread conversations when Unread chip is clicked', async () => {
    mocks.conversations = [makeConv('c1'), makeConv('c2')]
    mocks.dmUnreadCounts = { c1: 2 }
    render(<Sidebar />)
    await userEvent.click(screen.getByRole('button', { name: /Messages/ }))
    expect(screen.getAllByTestId('dm-card')).toHaveLength(2)
    await userEvent.click(screen.getByTestId('dm-filter-unread'))
    expect(screen.getAllByTestId('dm-card')).toHaveLength(1)
  })

  it('shows a caught-up empty state when no conversations are unread', async () => {
    mocks.conversations = [makeConv('c1')]
    mocks.dmUnreadCounts = {}
    render(<Sidebar />)
    await userEvent.click(screen.getByRole('button', { name: /Messages/ }))
    await userEvent.click(screen.getByTestId('dm-filter-unread'))
    expect(screen.getByTestId('no-unread-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('dm-card')).not.toBeInTheDocument()
  })

  it('opens the Settings hub from the footer button', async () => {
    render(<Sidebar />)
    expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument()
    await userEvent.click(screen.getByTestId('profile-footer-btn'))
    expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
  })

  it('asks for confirmation before logging out', async () => {
    render(<Sidebar />)
    await userEvent.click(screen.getByLabelText('Logout'))
    // Should NOT log out immediately — a confirmation is shown first
    expect(mocks.logout).not.toHaveBeenCalled()
    expect(screen.getByText('Are you sure you want to log out?')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('confirm-logout-btn'))
    expect(mocks.logout).toHaveBeenCalledOnce()
  })

  it('does not log out when confirmation is cancelled', async () => {
    render(<Sidebar />)
    await userEvent.click(screen.getByLabelText('Logout'))
    await userEvent.click(screen.getByTestId('cancel-logout-btn'))
    expect(mocks.logout).not.toHaveBeenCalled()
    expect(screen.queryByText('Are you sure you want to log out?')).not.toBeInTheDocument()
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
