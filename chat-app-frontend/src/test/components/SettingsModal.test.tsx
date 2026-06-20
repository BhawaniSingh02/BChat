import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { User } from '../../types'
import { useAuthStore } from '../../store/authStore'
import SettingsModal from '../../components/ui/SettingsModal'

const user: User = {
  id: '1', username: 'alice-id', email: 'alice@test.com',
  displayName: 'Alice Smith', uniqueHandle: 'alice', createdAt: '2026-01-01T00:00:00', lastSeen: '',
}

describe('SettingsModal', () => {
  const onClose = vi.fn()
  const onLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user })
  })

  const renderModal = () =>
    render(<SettingsModal open onClose={onClose} onLogout={onLogout} />)

  it('does not render when closed', () => {
    render(<SettingsModal open={false} onClose={onClose} onLogout={onLogout} />)
    expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument()
  })

  it('renders the hub with the profile card', () => {
    renderModal()
    expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
    expect(screen.getByTestId('settings-profile-card')).toHaveTextContent('Alice Smith')
    expect(screen.getByTestId('settings-profile-card')).toHaveTextContent('@alice')
  })

  it('shows the profile editor inline by default (with avatar + username fields)', () => {
    renderModal()
    expect(screen.getByTestId('handle-input')).toBeInTheDocument()
    expect(screen.getByTestId('display-name-input')).toBeInTheDocument()
    expect(screen.getByTestId('change-photo-btn')).toBeInTheDocument()
  })

  it('opens the profile editor inline from the profile card', () => {
    renderModal()
    fireEvent.click(screen.getByTestId('settings-nav-account'))
    expect(screen.queryByTestId('handle-input')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('settings-profile-card'))
    expect(screen.getByTestId('handle-input')).toBeInTheDocument()
  })

  it('shows the Account panel inline with password fields', () => {
    renderModal()
    fireEvent.click(screen.getByTestId('settings-nav-account'))
    expect(screen.getByTestId('current-password-input')).toBeInTheDocument()
    expect(screen.getByTestId('change-password-btn')).toBeInTheDocument()
  })

  it('switches to the profile editor from the Account "Edit profile" button', () => {
    renderModal()
    fireEvent.click(screen.getByTestId('settings-nav-account'))
    fireEvent.click(screen.getByTestId('account-edit-profile'))
    expect(screen.getByTestId('handle-input')).toBeInTheDocument()
  })

  it('shows the Privacy panel inline with privacy selects', () => {
    renderModal()
    fireEvent.click(screen.getByTestId('settings-nav-privacy'))
    expect(screen.getByTestId('last-seen-privacy')).toBeInTheDocument()
    expect(screen.getByTestId('online-privacy')).toBeInTheDocument()
  })

  it('shows the Chats panel with the theme picker', () => {
    renderModal()
    fireEvent.click(screen.getByTestId('settings-nav-chats'))
    expect(screen.getByTestId('theme-option-light')).toBeInTheDocument()
    expect(screen.getByTestId('theme-option-dark')).toBeInTheDocument()
    expect(screen.getByTestId('theme-option-system')).toBeInTheDocument()
  })

  it('switches the right pane to Keyboard shortcuts', () => {
    renderModal()
    fireEvent.click(screen.getByTestId('settings-nav-shortcuts'))
    expect(screen.getByText('Speed up the things you do most.')).toBeInTheDocument()
    expect(screen.getByText('Send the message you’re typing')).toBeInTheDocument()
  })

  it('switches the right pane to Help', () => {
    renderModal()
    fireEvent.click(screen.getByTestId('settings-nav-help'))
    expect(screen.getByText('About Baaat and where to get support.')).toBeInTheDocument()
  })

  it('confirms before logging out', () => {
    renderModal()
    fireEvent.click(screen.getByTestId('settings-logout'))
    expect(onLogout).not.toHaveBeenCalled()
    expect(screen.getByTestId('settings-logout-confirm')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('settings-confirm-logout'))
    expect(onLogout).toHaveBeenCalledOnce()
  })

  it('cancels logout without logging out', () => {
    renderModal()
    fireEvent.click(screen.getByTestId('settings-logout'))
    fireEvent.click(screen.getByTestId('settings-cancel-logout'))
    expect(onLogout).not.toHaveBeenCalled()
    expect(screen.queryByTestId('settings-logout-confirm')).not.toBeInTheDocument()
  })

  it('drills into a section and back (mobile menu list ↔ section)', () => {
    renderModal()
    const rail = screen.getByTestId('settings-rail')
    const detail = screen.getByTestId('settings-detail')
    // List view: rail shown, detail hidden on mobile.
    expect(rail.className).toContain('flex')
    expect(detail.className).toContain('hidden md:flex')

    fireEvent.click(screen.getByTestId('settings-nav-privacy'))
    // Drilled in: rail hidden on mobile, detail shown, with a back button + title.
    expect(rail.className).toContain('hidden md:flex')
    expect(detail.className).toContain('flex')
    expect(screen.getByTestId('settings-back')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('settings-back'))
    // Back to the list.
    expect(detail.className).toContain('hidden md:flex')
    expect(rail.className).toContain('flex')
  })

  it('closes via the close button and backdrop', () => {
    renderModal()
    fireEvent.click(screen.getByTestId('settings-close'))
    fireEvent.click(screen.getByTestId('settings-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
