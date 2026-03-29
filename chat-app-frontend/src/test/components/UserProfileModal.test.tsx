import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserProfileModal from '../../components/ui/UserProfileModal'
import type { User } from '../../types'

const mockIsOnline = vi.fn(() => false)

vi.mock('../../store/presenceStore', () => ({
  usePresenceStore: (selector: (s: any) => any) => {
    const state = { isOnline: mockIsOnline }
    return selector(state)
  },
}))

const mockGet = vi.fn()

vi.mock('../../api/users', () => ({
  usersApi: {
    get: (...args: any[]) => mockGet(...args),
  },
}))

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'u1',
  username: 'alice',
  email: 'alice@example.com',
  displayName: 'Alice A',
  bio: 'Hello world',
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
})
