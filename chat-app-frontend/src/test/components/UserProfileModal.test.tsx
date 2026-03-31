import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserProfileModal from '../../components/ui/UserProfileModal'
import type { User } from '../../types'

const mockIsOnline = vi.fn(() => false)

vi.mock('../../store/presenceStore', () => ({
  usePresenceStore: (selector: (s: unknown) => unknown) => {
    const state = { isOnline: mockIsOnline }
    return selector(state)
  },
}))

const mockGet = vi.fn()

vi.mock('../../api/users', () => ({
  usersApi: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}))

// Mock authStore — default: not logged in as the viewed user
const mockAuthUser = vi.fn((): User | null => null)
vi.mock('../../store/authStore', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => {
    const state = {
      user: mockAuthUser(),
      token: 'tok',
      isLoading: false,
      error: null,
      updateProfile: vi.fn(),
      uploadAvatar: vi.fn(),
      removeAvatar: vi.fn(),
      changePassword: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      fetchMe: vi.fn(),
    }
    return selector ? selector(state) : state
  },
}))

// Mock EditProfileModal to keep tests focused
vi.mock('../../components/ui/EditProfileModal', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="edit-profile-modal-mock">
      <button onClick={onClose} data-testid="close-edit-modal">Close</button>
    </div>
  ),
}))

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'u1',
  username: 'alice',
  email: 'alice@example.com',
  displayName: 'Alice A',
  bio: 'Hello world',
  statusMessage: 'Hey there!',
  createdAt: '2025-01-15T10:00:00',
  lastSeen: '2026-03-29T10:00:00',
  ...overrides,
})

describe('UserProfileModal', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    mockIsOnline.mockReturnValue(false)
    mockGet.mockReset()
    onClose.mockReset()
    mockAuthUser.mockReturnValue(null) // not logged in as alice by default
  })

  it('renders nothing when username is null', () => {
    const { container } = render(
      <UserProfileModal username={null} onClose={onClose} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders modal when username is provided', async () => {
    mockGet.mockResolvedValue(makeUser())
    render(<UserProfileModal username="alice" onClose={onClose} />)
    expect(screen.getByTestId('user-profile-modal')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByTestId('user-profile-display-name')).toHaveTextContent('Alice A')
    })
  })

  it('shows loading state while fetching', async () => {
    let resolve: (u: User) => void
    mockGet.mockReturnValue(new Promise((res) => { resolve = res }))
    render(<UserProfileModal username="alice" onClose={onClose} />)
    expect(screen.getByText('Loading profile…')).toBeInTheDocument()
    resolve!(makeUser())
    await waitFor(() => {
      expect(screen.queryByText('Loading profile…')).not.toBeInTheDocument()
    })
  })

  it('calls onClose when backdrop is clicked', async () => {
    mockGet.mockResolvedValue(makeUser())
    render(<UserProfileModal username="alice" onClose={onClose} />)
    await userEvent.click(screen.getByTestId('user-profile-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when close button is clicked', async () => {
    mockGet.mockResolvedValue(makeUser())
    render(<UserProfileModal username="alice" onClose={onClose} />)
    await userEvent.click(screen.getByTestId('close-user-profile-btn'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows error message when fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))
    render(<UserProfileModal username="alice" onClose={onClose} />)
    await waitFor(() => {
      expect(screen.getByText('Could not load profile.')).toBeInTheDocument()
    })
  })

  it('displays bio when provided', async () => {
    mockGet.mockResolvedValue(makeUser({ bio: 'My bio text' }))
    render(<UserProfileModal username="alice" onClose={onClose} />)
    await waitFor(() => {
      expect(screen.getByTestId('user-profile-bio')).toHaveTextContent('My bio text')
    })
  })

  it('displays status message when provided', async () => {
    mockGet.mockResolvedValue(makeUser({ statusMessage: 'Available' }))
    render(<UserProfileModal username="alice" onClose={onClose} />)
    await waitFor(() => {
      expect(screen.getByTestId('user-profile-status')).toHaveTextContent('Available')
    })
  })

  it('does NOT show Edit button for other users', async () => {
    mockAuthUser.mockReturnValue({ ...makeUser(), username: 'bob' }) // logged in as bob
    mockGet.mockResolvedValue(makeUser()) // viewing alice's profile
    render(<UserProfileModal username="alice" onClose={onClose} />)
    await waitFor(() => screen.getByTestId('user-profile-display-name'))
    expect(screen.queryByTestId('edit-own-profile-btn')).not.toBeInTheDocument()
  })

  it('shows Edit button for own profile', async () => {
    mockAuthUser.mockReturnValue(makeUser()) // logged in as alice
    mockGet.mockResolvedValue(makeUser())
    render(<UserProfileModal username="alice" onClose={onClose} />)
    await waitFor(() => expect(screen.getByTestId('edit-own-profile-btn')).toBeInTheDocument())
  })

  it('opens EditProfileModal when Edit button is clicked', async () => {
    mockAuthUser.mockReturnValue(makeUser())
    mockGet.mockResolvedValue(makeUser())
    render(<UserProfileModal username="alice" onClose={onClose} />)
    await waitFor(() => screen.getByTestId('edit-own-profile-btn'))
    await userEvent.click(screen.getByTestId('edit-own-profile-btn'))
    expect(screen.getByTestId('edit-profile-modal-mock')).toBeInTheDocument()
  })

  it('closes EditProfileModal when its close button is clicked', async () => {
    mockAuthUser.mockReturnValue(makeUser())
    mockGet.mockResolvedValue(makeUser())
    render(<UserProfileModal username="alice" onClose={onClose} />)
    await waitFor(() => screen.getByTestId('edit-own-profile-btn'))
    await userEvent.click(screen.getByTestId('edit-own-profile-btn'))
    expect(screen.getByTestId('edit-profile-modal-mock')).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('close-edit-modal'))
    expect(screen.queryByTestId('edit-profile-modal-mock')).not.toBeInTheDocument()
  })
})
