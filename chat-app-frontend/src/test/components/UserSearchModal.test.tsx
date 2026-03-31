import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserSearchModal from '../../components/ui/UserSearchModal'
import { usersApi } from '../../api/users'
import { usePresenceStore } from '../../store/presenceStore'

vi.mock('../../api/users')

beforeEach(() => {
  usePresenceStore.setState({ onlineUsers: new Set(['charlie']) })
  vi.clearAllMocks()
})

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onSelectUser: vi.fn(),
  currentUsername: 'alice',
}

describe('UserSearchModal', () => {
  it('renders search input when open', () => {
    render(<UserSearchModal {...defaultProps} />)
    expect(screen.getByLabelText('Search users')).toBeInTheDocument()
  })

  it('shows placeholder prompt initially', () => {
    render(<UserSearchModal {...defaultProps} />)
    expect(screen.getByText('Type a username to search')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<UserSearchModal {...defaultProps} open={false} />)
    expect(screen.queryByLabelText('Search users')).not.toBeInTheDocument()
  })

  it('shows searching state while loading', async () => {
    vi.mocked(usersApi.search).mockImplementation(
      () => new Promise(() => {}) // never resolves
    )
    render(<UserSearchModal {...defaultProps} />)
    await userEvent.type(screen.getByLabelText('Search users'), 'bob')
    expect(await screen.findByText('Searching…')).toBeInTheDocument()
  })

  it('shows no results message when search returns empty', async () => {
    vi.mocked(usersApi.search).mockResolvedValue([])
    render(<UserSearchModal {...defaultProps} />)
    await userEvent.type(screen.getByLabelText('Search users'), 'xyz')
    await waitFor(() => expect(screen.getByText('No users found')).toBeInTheDocument())
  })

  it('renders search results', async () => {
    vi.mocked(usersApi.search).mockResolvedValue([
      { id: '1', username: 'bob', email: 'bob@test.com', createdAt: '2024-01-01T00:00:00Z', lastSeen: '2024-01-01T00:00:00Z' },
      { id: '2', username: 'charlie', email: 'charlie@test.com', createdAt: '2024-01-01T00:00:00Z', lastSeen: '2024-01-01T00:00:00Z' },
    ])
    render(<UserSearchModal {...defaultProps} />)
    await userEvent.type(screen.getByLabelText('Search users'), 'b')
    await waitFor(() => expect(screen.getAllByTestId('user-search-result')).toHaveLength(2))
  })

  it('filters out current user from results', async () => {
    vi.mocked(usersApi.search).mockResolvedValue([
      { id: '1', username: 'alice', email: 'alice@test.com', createdAt: '2024-01-01T00:00:00Z', lastSeen: '2024-01-01T00:00:00Z' },
      { id: '2', username: 'bob', email: 'bob@test.com', createdAt: '2024-01-01T00:00:00Z', lastSeen: '2024-01-01T00:00:00Z' },
    ])
    render(<UserSearchModal {...defaultProps} />)
    await userEvent.type(screen.getByLabelText('Search users'), 'a')
    await waitFor(() => expect(screen.getAllByTestId('user-search-result')).toHaveLength(1))
    expect(screen.queryByText('alice')).not.toBeInTheDocument()
  })

  it('calls onSelectUser and onClose when a user is selected', async () => {
    const onSelectUser = vi.fn()
    const onClose = vi.fn()
    vi.mocked(usersApi.search).mockResolvedValue([
      { id: '2', username: 'bob', email: 'bob@test.com', createdAt: '2024-01-01T00:00:00Z', lastSeen: '2024-01-01T00:00:00Z' },
    ])
    render(<UserSearchModal {...defaultProps} onSelectUser={onSelectUser} onClose={onClose} />)
    await userEvent.type(screen.getByLabelText('Search users'), 'b')
    const result = await screen.findByTestId('user-search-result')
    await userEvent.click(result)
    expect(onSelectUser).toHaveBeenCalledWith('bob')
    expect(onClose).toHaveBeenCalled()
  })
})
