import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { User } from '../../types'

vi.mock('../../api/users', () => ({
  usersApi: { checkHandle: vi.fn(), claimHandle: vi.fn() },
}))

import ChooseUsername from '../../components/auth/ChooseUsername'
import { useAuthStore } from '../../store/authStore'
import { usersApi } from '../../api/users'

const baseUser: User = {
  id: '1',
  username: 'opaque-internal-id',
  email: 'alice@example.com',
  displayName: 'Alice',
  createdAt: '2026-01-01T00:00:00',
  lastSeen: '2026-01-01T00:00:00',
}

describe('ChooseUsername', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: { ...baseUser }, justRegistered: true })
  })

  it('shows availability and claims the username', async () => {
    vi.mocked(usersApi.checkHandle).mockResolvedValue({ available: true })
    vi.mocked(usersApi.claimHandle).mockResolvedValue({ ...baseUser, uniqueHandle: 'alice' })

    render(<ChooseUsername />)
    fireEvent.change(screen.getByTestId('choose-username-input'), { target: { value: 'alice' } })

    await waitFor(() => expect(screen.getByTestId('handle-available')).toBeInTheDocument())
    expect(screen.getByTestId('claim-username-btn')).not.toBeDisabled()

    fireEvent.click(screen.getByTestId('claim-username-btn'))
    await waitFor(() => expect(usersApi.claimHandle).toHaveBeenCalledWith('alice'))
  })

  it('shows the reason and keeps Continue disabled when taken', async () => {
    vi.mocked(usersApi.checkHandle).mockResolvedValue({ available: false, reason: 'This username is taken' })

    render(<ChooseUsername />)
    fireEvent.change(screen.getByTestId('choose-username-input'), { target: { value: 'taken' } })

    await waitFor(() => expect(screen.getByTestId('handle-unavailable')).toBeInTheDocument())
    expect(screen.getByText('This username is taken')).toBeInTheDocument()
    expect(screen.getByTestId('claim-username-btn')).toBeDisabled()
  })

  it('strips invalid characters from input', () => {
    render(<ChooseUsername />)
    const input = screen.getByTestId('choose-username-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Al ice!@#' } })
    expect(input.value).toBe('alice')
  })
})
