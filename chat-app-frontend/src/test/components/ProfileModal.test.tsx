import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({
  user: {
    id: '1',
    username: 'alice',
    email: 'alice@test.com',
    displayName: 'Alice Smith',
    bio: 'Hello world',
    createdAt: '2026-01-01T00:00:00',
    lastSeen: '2026-03-28T10:00:00',
  } as any,
  updateProfile: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../store/authStore', () => ({
  useAuthStore: (selector: (s: any) => any) =>
    selector({ user: mocks.user, updateProfile: mocks.updateProfile }),
}))

import ProfileModal from '../../components/ui/ProfileModal'

describe('ProfileModal', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    onClose.mockReset()
  })

  it('renders nothing when closed', () => {
    render(<ProfileModal open={false} onClose={onClose} />)
    expect(screen.queryByTestId('profile-modal')).not.toBeInTheDocument()
  })

  it('renders profile when open', () => {
    render(<ProfileModal open onClose={onClose} />)
    expect(screen.getByTestId('profile-modal')).toBeInTheDocument()
  })

  it('shows username and email', () => {
    render(<ProfileModal open onClose={onClose} />)
    expect(screen.getByText('@alice')).toBeInTheDocument()
    expect(screen.getByTestId('profile-email')).toHaveTextContent('alice@test.com')
  })

  it('shows display name if set', () => {
    render(<ProfileModal open onClose={onClose} />)
    expect(screen.getByTestId('profile-display-name')).toHaveTextContent('Alice Smith')
  })

  it('falls back to username when no displayName', () => {
    mocks.user = { ...mocks.user, displayName: undefined }
    render(<ProfileModal open onClose={onClose} />)
    expect(screen.getByTestId('profile-display-name')).toHaveTextContent('alice')
  })

  it('shows bio when set', () => {
    mocks.user = { ...mocks.user, displayName: 'Alice Smith', bio: 'Hello world' }
    render(<ProfileModal open onClose={onClose} />)
    expect(screen.getByTestId('profile-bio')).toHaveTextContent('Hello world')
  })

  it('closes when backdrop is clicked', async () => {
    render(<ProfileModal open onClose={onClose} />)
    await userEvent.click(screen.getByTestId('profile-backdrop'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes when close button is clicked', async () => {
    render(<ProfileModal open onClose={onClose} />)
    await userEvent.click(screen.getByTestId('close-profile-btn'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows edit form when edit button clicked', async () => {
    mocks.user = { ...mocks.user, displayName: 'Alice Smith', bio: 'Hello world' }
    render(<ProfileModal open onClose={onClose} />)
    await userEvent.click(screen.getByTestId('edit-profile-btn'))
    expect(screen.getByTestId('profile-edit-form')).toBeInTheDocument()
  })

  it('calls updateProfile with all fields on save', async () => {
    mocks.user = { ...mocks.user, displayName: 'Alice Smith', bio: 'Hello world' }
    render(<ProfileModal open onClose={onClose} />)
    await userEvent.click(screen.getByTestId('edit-profile-btn'))
    await userEvent.clear(screen.getByTestId('display-name-input'))
    await userEvent.type(screen.getByTestId('display-name-input'), 'Alice New')
    await userEvent.click(screen.getByTestId('save-profile-btn'))
    await waitFor(() => {
      expect(mocks.updateProfile).toHaveBeenCalledWith({ displayName: 'Alice New', bio: 'Hello world' })
    })
  })

  it('cancels edit and restores original values', async () => {
    mocks.user = { ...mocks.user, displayName: 'Alice Smith', bio: 'Hello world' }
    render(<ProfileModal open onClose={onClose} />)
    await userEvent.click(screen.getByTestId('edit-profile-btn'))
    await userEvent.clear(screen.getByTestId('display-name-input'))
    await userEvent.type(screen.getByTestId('display-name-input'), 'Temp Name')
    await userEvent.click(screen.getByTestId('cancel-profile-btn'))
    expect(screen.queryByTestId('profile-edit-form')).not.toBeInTheDocument()
  })

  it('shows success message after save', async () => {
    mocks.user = { ...mocks.user, displayName: 'Alice', bio: '' }
    render(<ProfileModal open onClose={onClose} />)
    await userEvent.click(screen.getByTestId('edit-profile-btn'))
    await userEvent.type(screen.getByTestId('bio-input'), 'New bio')
    await userEvent.click(screen.getByTestId('save-profile-btn'))
    await waitFor(() => {
      expect(screen.getByTestId('profile-success')).toBeInTheDocument()
    })
  })

  it('shows error when updateProfile fails', async () => {
    mocks.user = { ...mocks.user, displayName: 'Alice', bio: '' }
    mocks.updateProfile.mockRejectedValueOnce(new Error('Network error'))
    render(<ProfileModal open onClose={onClose} />)
    await userEvent.click(screen.getByTestId('edit-profile-btn'))
    await userEvent.type(screen.getByTestId('bio-input'), 'New bio')
    await userEvent.click(screen.getByTestId('save-profile-btn'))
    await waitFor(() => {
      expect(screen.getByTestId('profile-error')).toBeInTheDocument()
    })
  })
})
