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
  const onOpenProfileTab = vi.fn()
  const onLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user })
  })

  const renderModal = () =>
    render(<SettingsModal open onClose={onClose} onOpenProfileTab={onOpenProfileTab} onLogout={onLogout} />)

  it('does not render when closed', () => {
    render(<SettingsModal open={false} onClose={onClose} onOpenProfileTab={onOpenProfileTab} onLogout={onLogout} />)
    expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument()
  })

  it('renders the hub with the profile card', () => {
    renderModal()
    expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
    expect(screen.getByTestId('settings-profile-card')).toHaveTextContent('Alice Smith')
    expect(screen.getByTestId('settings-profile-card')).toHaveTextContent('@alice')
  })

  it('opens the profile editor from the profile card', () => {
    renderModal()
    fireEvent.click(screen.getByTestId('settings-profile-card'))
    expect(onOpenProfileTab).toHaveBeenCalledWith('profile')
  })

  it('opens the password tab from Account', () => {
    renderModal()
    fireEvent.click(screen.getByTestId('settings-nav-account'))
    expect(onOpenProfileTab).toHaveBeenCalledWith('password')
  })

  it('opens the privacy tab from Privacy', () => {
    renderModal()
    fireEvent.click(screen.getByTestId('settings-nav-privacy'))
    expect(onOpenProfileTab).toHaveBeenCalledWith('privacy')
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

  it('closes via the close button and backdrop', () => {
    renderModal()
    fireEvent.click(screen.getByTestId('settings-close'))
    fireEvent.click(screen.getByTestId('settings-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
