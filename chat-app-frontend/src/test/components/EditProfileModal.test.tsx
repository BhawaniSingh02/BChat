import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditProfileModal from '../../components/ui/EditProfileModal'
import type { User } from '../../types'
import * as authStore from '../../store/authStore'

const baseUser: User = {
  id: 'id-alice',
  username: 'alice',
  email: 'alice@example.com',
  displayName: 'Alice Smith',
  bio: 'Hello world',
  statusMessage: 'Hey there!',
  avatarUrl: undefined,
  lastSeenPrivacy: 'EVERYONE',
  onlinePrivacy: 'EVERYONE',
  profilePhotoPrivacy: 'EVERYONE',
  createdAt: '2025-01-01T00:00:00',
  lastSeen: '2025-06-01T10:00:00',
}

const mockUpdateProfile = vi.fn()
const mockUploadAvatar = vi.fn()
const mockRemoveAvatar = vi.fn()
const mockChangePassword = vi.fn()
const mockOnClose = vi.fn()

vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

function setupMocks(overrides: Partial<ReturnType<typeof authStore.useAuthStore>> = {}) {
  vi.mocked(authStore.useAuthStore).mockImplementation((selector) => {
    const state = {
      user: baseUser,
      token: 'tok',
      isInitialized: true,
      isLoading: false,
      error: null,
      pendingVerificationEmail: null,
      updateProfile: mockUpdateProfile,
      uploadAvatar: mockUploadAvatar,
      removeAvatar: mockRemoveAvatar,
      changePassword: mockChangePassword,
      login: vi.fn(),
      register: vi.fn(),
      verifyEmailOtp: vi.fn(),
      resendVerification: vi.fn(),
      clearError: vi.fn(),
      logout: vi.fn(),
      fetchMe: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
      ...overrides,
    }
    return selector ? (selector as (s: typeof state) => unknown)(state) : state
  })
}

describe('EditProfileModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('renders with correct aria attributes', () => {
    render(<EditProfileModal user={baseUser} onClose={mockOnClose} />)
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Edit profile')
    expect(screen.getByTestId('edit-profile-modal')).toBeInTheDocument()
  })

  it('closes when backdrop is clicked', async () => {
    render(<EditProfileModal user={baseUser} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('edit-profile-backdrop'))
    expect(mockOnClose).toHaveBeenCalledOnce()
  })

  it('closes when X button is clicked', async () => {
    render(<EditProfileModal user={baseUser} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('close-edit-profile-btn'))
    expect(mockOnClose).toHaveBeenCalledOnce()
  })

  // ── Profile tab ────────────────────────────────────────────────────────────

  it('shows profile tab by default', () => {
    render(<EditProfileModal user={baseUser} onClose={mockOnClose} />)
    expect(screen.getByTestId('displayname-input')).toBeInTheDocument()
    expect(screen.getByTestId('status-input')).toBeInTheDocument()
    expect(screen.getByTestId('bio-input')).toBeInTheDocument()
  })

  it('pre-fills profile fields from user prop', () => {
    render(<EditProfileModal user={baseUser} onClose={mockOnClose} />)
    expect(screen.getByTestId('displayname-input')).toHaveValue('Alice Smith')
    expect(screen.getByTestId('status-input')).toHaveValue('Hey there!')
    expect(screen.getByTestId('bio-input')).toHaveValue('Hello world')
  })

  it('saves profile on button click', async () => {
    mockUpdateProfile.mockResolvedValue(undefined)
    render(<EditProfileModal user={baseUser} onClose={mockOnClose} />)

    const input = screen.getByTestId('displayname-input')
    await userEvent.clear(input)
    await userEvent.type(input, 'New Name')

    fireEvent.click(screen.getByTestId('save-profile-btn'))

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'New Name' })
    ))
  })

  it('shows success message after saving profile', async () => {
    mockUpdateProfile.mockResolvedValue(undefined)
    render(<EditProfileModal user={baseUser} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('save-profile-btn'))
    await waitFor(() => expect(screen.getByTestId('edit-profile-success')).toBeInTheDocument())
    expect(screen.getByTestId('edit-profile-success')).toHaveTextContent('Profile saved')
  })

  it('shows error message when profile save fails', async () => {
    mockUpdateProfile.mockRejectedValue(new Error('Network error'))
    render(<EditProfileModal user={baseUser} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('save-profile-btn'))
    await waitFor(() => expect(screen.getByTestId('edit-profile-error')).toBeInTheDocument())
    expect(screen.getByTestId('edit-profile-error')).toHaveTextContent('Failed to save profile')
  })

  it('shows bio character count', () => {
    render(<EditProfileModal user={baseUser} onClose={mockOnClose} />)
    expect(screen.getByText('11/250')).toBeInTheDocument() // 'Hello world' = 11 chars
  })

  // ── Avatar ─────────────────────────────────────────────────────────────────

  it('shows change-photo and remove buttons', () => {
    const userWithAvatar = { ...baseUser, avatarUrl: 'https://example.com/avatar.jpg' }
    render(<EditProfileModal user={userWithAvatar} onClose={mockOnClose} />)
    expect(screen.getByTestId('change-photo-btn')).toBeInTheDocument()
    expect(screen.getByTestId('remove-photo-btn')).toBeInTheDocument()
  })

  it('shows change-photo button but no remove when no avatar', () => {
    render(<EditProfileModal user={baseUser} onClose={mockOnClose} />)
    expect(screen.getByTestId('change-photo-btn')).toBeInTheDocument()
    expect(screen.queryByTestId('remove-photo-btn')).not.toBeInTheDocument()
  })

  it('calls removeAvatar when remove button clicked', async () => {
    mockRemoveAvatar.mockResolvedValue(undefined)
    const userWithAvatar = { ...baseUser, avatarUrl: 'https://example.com/avatar.jpg' }
    render(<EditProfileModal user={userWithAvatar} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('remove-photo-btn'))
    await waitFor(() => expect(mockRemoveAvatar).toHaveBeenCalledOnce())
  })

  // ── Password tab ───────────────────────────────────────────────────────────

  it('switches to password tab', () => {
    render(<EditProfileModal user={baseUser} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('edit-profile-tab-password'))
    expect(screen.getByTestId('current-password-input')).toBeInTheDocument()
    expect(screen.getByTestId('new-password-input')).toBeInTheDocument()
    expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument()
  })

  it('change password button is disabled when fields are empty', () => {
    render(<EditProfileModal user={baseUser} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('edit-profile-tab-password'))
    expect(screen.getByTestId('change-password-btn')).toBeDisabled()
  })

  it('shows error when passwords do not match', async () => {
    render(<EditProfileModal user={baseUser} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('edit-profile-tab-password'))

    await userEvent.type(screen.getByTestId('current-password-input'), 'oldpass')
    await userEvent.type(screen.getByTestId('new-password-input'), 'newpass1')
    await userEvent.type(screen.getByTestId('confirm-password-input'), 'newpass2')

    fireEvent.click(screen.getByTestId('change-password-btn'))

    await waitFor(() =>
      expect(screen.getByTestId('edit-profile-error')).toHaveTextContent('New passwords do not match')
    )
    expect(mockChangePassword).not.toHaveBeenCalled()
  })

  it('shows error when new password is too short', async () => {
    render(<EditProfileModal user={baseUser} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('edit-profile-tab-password'))

    await userEvent.type(screen.getByTestId('current-password-input'), 'oldpass')
    await userEvent.type(screen.getByTestId('new-password-input'), 'abc')
    await userEvent.type(screen.getByTestId('confirm-password-input'), 'abc')

    fireEvent.click(screen.getByTestId('change-password-btn'))

    await waitFor(() =>
      expect(screen.getByTestId('edit-profile-error')).toHaveTextContent('at least 6 characters')
    )
  })

  it('calls changePassword with correct data and shows success', async () => {
    mockChangePassword.mockResolvedValue(undefined)
    render(<EditProfileModal user={baseUser} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('edit-profile-tab-password'))

    await userEvent.type(screen.getByTestId('current-password-input'), 'oldpass')
    await userEvent.type(screen.getByTestId('new-password-input'), 'newpass123')
    await userEvent.type(screen.getByTestId('confirm-password-input'), 'newpass123')

    fireEvent.click(screen.getByTestId('change-password-btn'))

    await waitFor(() =>
      expect(mockChangePassword).toHaveBeenCalledWith({
        currentPassword: 'oldpass',
        newPassword: 'newpass123',
      })
    )
    await waitFor(() =>
      expect(screen.getByTestId('edit-profile-success')).toHaveTextContent('Password changed successfully')
    )
  })

  it('shows error when changePassword API fails', async () => {
    mockChangePassword.mockRejectedValue({
      response: { data: { message: 'Current password is incorrect' } },
    })
    render(<EditProfileModal user={baseUser} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('edit-profile-tab-password'))

    await userEvent.type(screen.getByTestId('current-password-input'), 'wrong')
    await userEvent.type(screen.getByTestId('new-password-input'), 'newpass123')
    await userEvent.type(screen.getByTestId('confirm-password-input'), 'newpass123')

    fireEvent.click(screen.getByTestId('change-password-btn'))

    await waitFor(() =>
      expect(screen.getByTestId('edit-profile-error')).toHaveTextContent('Current password is incorrect')
    )
  })

  // ── Privacy tab ────────────────────────────────────────────────────────────

  it('switches to privacy tab', () => {
    render(<EditProfileModal user={baseUser} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('edit-profile-tab-privacy'))
    expect(screen.getByTestId('last-seen-privacy')).toBeInTheDocument()
    expect(screen.getByTestId('online-privacy')).toBeInTheDocument()
    expect(screen.getByTestId('profile-photo-privacy')).toBeInTheDocument()
  })

  it('pre-fills privacy selects from user props', () => {
    const userWithPrivacy = { ...baseUser, lastSeenPrivacy: 'NOBODY' as const, onlinePrivacy: 'NOBODY' as const }
    render(<EditProfileModal user={userWithPrivacy} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('edit-profile-tab-privacy'))
    expect(screen.getByTestId('last-seen-privacy')).toHaveValue('NOBODY')
    expect(screen.getByTestId('online-privacy')).toHaveValue('NOBODY')
  })

  it('saves privacy settings on button click', async () => {
    mockUpdateProfile.mockResolvedValue(undefined)
    render(<EditProfileModal user={baseUser} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('edit-profile-tab-privacy'))

    fireEvent.change(screen.getByTestId('last-seen-privacy'), { target: { value: 'NOBODY' } })
    fireEvent.click(screen.getByTestId('save-privacy-btn'))

    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ lastSeenPrivacy: 'NOBODY' })
      )
    )
  })

  it('shows success after saving privacy settings', async () => {
    mockUpdateProfile.mockResolvedValue(undefined)
    render(<EditProfileModal user={baseUser} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('edit-profile-tab-privacy'))
    fireEvent.click(screen.getByTestId('save-privacy-btn'))
    await waitFor(() =>
      expect(screen.getByTestId('edit-profile-success')).toHaveTextContent('Privacy settings saved')
    )
  })

  it('clears error when switching tabs', async () => {
    mockUpdateProfile.mockRejectedValue(new Error('fail'))
    render(<EditProfileModal user={baseUser} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('save-profile-btn'))
    await waitFor(() => expect(screen.getByTestId('edit-profile-error')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('edit-profile-tab-privacy'))
    expect(screen.queryByTestId('edit-profile-error')).not.toBeInTheDocument()
  })

  it('online privacy select only has EVERYONE and NOBODY options', () => {
    render(<EditProfileModal user={baseUser} onClose={mockOnClose} />)
    fireEvent.click(screen.getByTestId('edit-profile-tab-privacy'))
    const select = screen.getByTestId('online-privacy')
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.value)
    expect(options).toEqual(['EVERYONE', 'NOBODY'])
    expect(options).not.toContain('CONTACTS')
  })
})
