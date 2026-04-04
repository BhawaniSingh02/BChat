import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Room, DirectConversation } from '../../types'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  // store state
  user: { username: 'alice', email: 'alice@test.com', id: '1' },
  token: 'test-token',
  myRooms: [] as Room[],
  rooms: [] as Room[],
  activeRoomId: null as string | null,
  activeDMId: null as string | null,
  conversations: [] as DirectConversation[],
  isLoading: false,

  // store actions
  fetchMyRooms: vi.fn().mockResolvedValue(undefined),
  fetchAllRooms: vi.fn().mockResolvedValue(undefined),
  setActiveRoom: vi.fn(),
  leaveRoom: vi.fn().mockResolvedValue(undefined),
  joinRoom: vi.fn().mockResolvedValue(undefined),
  fetchConversations: vi.fn().mockResolvedValue(undefined),
  fetchOnlineUsers: vi.fn().mockResolvedValue(undefined),
  updateRoomLastMessage: vi.fn(),

  // WebSocket actions
  subscribeToRoom: vi.fn(),
  sendMessage: vi.fn(),
  sendTyping: vi.fn(),
  sendDM: vi.fn(),
  editMessage: vi.fn(),
  deleteMessage: vi.fn(),
  reactToMessage: vi.fn(),
  isConnected: vi.fn(() => false),
}))

vi.mock('../../store/authStore', () => ({
  useAuthStore: (selector?: (s: any) => any) => {
    const state = { user: mocks.user, token: mocks.token, logout: vi.fn() }
    return selector ? selector(state) : state
  },
}))

vi.mock('../../store/roomStore', () => ({
  useRoomStore: (selector?: (s: any) => any) => {
    const state = {
      myRooms: mocks.myRooms,
      rooms: mocks.rooms,
      activeRoomId: mocks.activeRoomId,
      isLoading: mocks.isLoading,
      fetchMyRooms: mocks.fetchMyRooms,
      fetchAllRooms: mocks.fetchAllRooms,
      setActiveRoom: mocks.setActiveRoom,
      leaveRoom: mocks.leaveRoom,
      joinRoom: mocks.joinRoom,
      updateRoomLastMessage: mocks.updateRoomLastMessage,
      kickMember: vi.fn().mockResolvedValue(undefined),
      pinMessage: vi.fn().mockResolvedValue(undefined),
      unpinMessage: vi.fn().mockResolvedValue(undefined),
    }
    return selector ? selector(state) : state
  },
}))

vi.mock('../../store/dmStore', () => ({
  useDMStore: (selector?: (s: any) => any) => {
    const state = {
      conversations: mocks.conversations,
      activeDMId: mocks.activeDMId,
      fetchConversations: mocks.fetchConversations,
      setActiveDM: vi.fn(),
      getOrCreateConversation: vi.fn(),
      dmUnreadCounts: {},
      resetDMUnread: vi.fn(),
    }
    return selector ? selector(state) : state
  },
}))

vi.mock('../../store/presenceStore', () => ({
  usePresenceStore: (selector?: (s: any) => any) => {
    const state = { isOnline: () => false, onlineUsers: [], fetchOnlineUsers: mocks.fetchOnlineUsers, applyEvent: vi.fn() }
    return selector ? selector(state) : state
  },
}))

vi.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    subscribeToRoom: mocks.subscribeToRoom,
    sendMessage: mocks.sendMessage,
    sendTyping: mocks.sendTyping,
    sendDM: mocks.sendDM,
    editMessage: mocks.editMessage,
    deleteMessage: mocks.deleteMessage,
    reactToMessage: mocks.reactToMessage,
    editDMMessage: vi.fn(),
    deleteDMMessage: vi.fn(),
    reactToDMMessage: vi.fn(),
    isConnected: mocks.isConnected,
    connected: false,
  }),
}))

vi.mock('../../store/chatStore', () => ({
  useChatStore: (selector: (s: any) => any) =>
    selector({
      messages: {},
      typingUsers: {},
      isLoadingMessages: false,
      unreadCounts: {},
      fetchMessages: vi.fn(),
      upsertMessage: vi.fn(),
      resetUnread: vi.fn(),
      incrementUnread: vi.fn(),
    }),
}))

// Mock child components to keep tests focused
vi.mock('../../components/layout/Sidebar', () => ({
  default: () => <div data-testid="sidebar" />,
}))

vi.mock('../../components/chat/ChatView', () => ({
  default: ({ room, onLeave }: { room: any; onLeave?: () => void }) => (
    <div data-testid="chat-view">
      <span>{room.name}</span>
      {onLeave && <button onClick={onLeave} data-testid="leave-btn">Leave</button>}
    </div>
  ),
}))

vi.mock('../../components/chat/DMChatView', () => ({
  default: ({ conversation }: { conversation: any }) => (
    <div data-testid="dm-chat-view"><span>{conversation.id}</span></div>
  ),
}))

vi.mock('../../components/rooms/CreateRoomModal', () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? <div data-testid="create-room-modal"><button onClick={onClose}>Close</button></div> : null,
}))

vi.mock('../../components/ui/Modal', () => ({
  default: ({ open, children, title }: { open: boolean; children: React.ReactNode; title: string }) =>
    open ? <div data-testid="modal" aria-label={title}>{children}</div> : null,
}))

vi.mock('../../components/rooms/RoomList', () => ({
  default: () => <div data-testid="room-list" />,
}))

import ChatPage from '../../pages/ChatPage'

const makeRoom = (id: string, name: string): Room => ({
  id,
  roomId: id,
  name,
  description: '',
  createdBy: 'alice',
  members: ['alice'],
  memberCount: 1,
  createdAt: '2026-01-01T00:00:00',
})

describe('ChatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.myRooms = []
    mocks.rooms = []
    mocks.activeRoomId = null
    mocks.activeDMId = null
    mocks.conversations = []
    mocks.isLoading = false
  })

  it('renders sidebar', () => {
    render(<ChatPage />)
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })

  it('calls fetchMyRooms, fetchAllRooms, fetchConversations, fetchOnlineUsers on mount', async () => {
    render(<ChatPage />)
    await waitFor(() => {
      expect(mocks.fetchMyRooms).toHaveBeenCalledOnce()
      expect(mocks.fetchAllRooms).toHaveBeenCalledOnce()
      expect(mocks.fetchConversations).toHaveBeenCalledOnce()
      expect(mocks.fetchOnlineUsers).toHaveBeenCalledOnce()
    })
  })

  it('shows welcome screen when no rooms are active', () => {
    render(<ChatPage />)
    expect(screen.getByText('Welcome to Baaat')).toBeInTheDocument()
  })

  it('shows Create Room CTA on welcome screen', () => {
    render(<ChatPage />)
    expect(screen.getByTestId('create-room-cta')).toBeInTheDocument()
  })

  it('shows Browse Rooms CTA on welcome screen', () => {
    render(<ChatPage />)
    expect(screen.getByTestId('browse-rooms-cta')).toBeInTheDocument()
  })

  it('opens CreateRoomModal when Create Room CTA is clicked', async () => {
    render(<ChatPage />)
    await userEvent.click(screen.getByTestId('create-room-cta'))
    expect(screen.getByTestId('create-room-modal')).toBeInTheDocument()
  })

  it('opens browse rooms modal when Browse Rooms CTA is clicked', async () => {
    render(<ChatPage />)
    await userEvent.click(screen.getByTestId('browse-rooms-cta'))
    expect(screen.getByTestId('modal')).toBeInTheDocument()
  })

  it('renders ChatView when a room is active', () => {
    mocks.myRooms = [makeRoom('general', 'General')]
    mocks.activeRoomId = 'general'
    render(<ChatPage />)
    expect(screen.getByTestId('chat-view')).toBeInTheDocument()
    expect(screen.getByText('General')).toBeInTheDocument()
  })

  it('shows loading spinner when rooms are loading', () => {
    mocks.isLoading = true
    render(<ChatPage />)
    expect(screen.getByText('Loading your rooms…')).toBeInTheDocument()
  })

  it('shows API error banner when data fetch fails', async () => {
    mocks.fetchMyRooms.mockRejectedValueOnce(new Error('Network error'))
    render(<ChatPage />)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Could not connect to server')
  })

  it('dismisses API error banner on click', async () => {
    mocks.fetchMyRooms.mockRejectedValueOnce(new Error('Network error'))
    render(<ChatPage />)
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Dismiss'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('calls setActiveRoom with first room when myRooms is populated and none active', async () => {
    // Pre-populate rooms so the auto-select effect fires on mount
    mocks.myRooms = [makeRoom('general', 'General')]
    mocks.activeRoomId = null
    render(<ChatPage />)
    await waitFor(() => expect(mocks.setActiveRoom).toHaveBeenCalledWith('general'))
  })
})
