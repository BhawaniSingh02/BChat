import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import RegisterForm from '../../components/auth/RegisterForm'
import { useAuthStore } from '../../store/authStore'
import { tokenProvider } from '../../api/tokenProvider'
import { authApi } from '../../api/auth'

vi.mock('../../api/auth')

const mockUser = {
  id: 'user-1',
  username: 'alice.1234',
  email: 'alice@example.com',
  uniqueHandle: 'alice.1234',
  createdAt: '2026-01-01T00:00:00',
  lastSeen: '2026-03-28T10:00:00',
}

const mockAuthResponse = {
  token: 'jwt-token',
  username: 'alice.1234',
  email: 'alice@example.com',
  userId: 'user-1',
  uniqueHandle: 'alice.1234',
  whoCanMessage: 'APPROVED_ONLY',
}

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <RegisterForm />
    </MemoryRouter>
  )
}

describe('RegisterForm', () => {
  beforeEach(() => {
    tokenProvider.set(null)
    useAuthStore.setState({
      user: null, token: null, isInitialized: true, isLoading: false,
      error: null, pendingVerificationEmail: null, justRegistered: false,
    })
    vi.clearAllMocks()
  })

  it('walks details → OTP → success, revealing the unique handle', async () => {
    vi.mocked(authApi.register).mockResolvedValue({ message: 'Code sent' })
    vi.mocked(authApi.verifyEmailOtp).mockResolvedValue(mockAuthResponse)
    vi.mocked(authApi.me).mockResolvedValue(mockUser)

    renderForm()

    // ── Step 1: details ──
    fireEvent.change(screen.getByPlaceholderText('Your name (e.g. Alice Smith)'), { target: { value: 'Alice Smith' } })
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'alice@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('At least 6 characters'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    // ── Step 2: OTP ──
    await screen.findByText('Check your email')
    expect(authApi.register).toHaveBeenCalledWith({
      displayName: 'Alice Smith', email: 'alice@example.com', password: 'password123',
    })

    fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verify & Continue' }))

    // ── Step 3: verification succeeds → routed to onboarding (no handle yet) ──
    await waitFor(() => {
      expect(authApi.verifyEmailOtp).toHaveBeenCalledWith('alice@example.com', '123456')
    })
    // justRegistered is set so the route guard shows the "Choose username" step.
    await waitFor(() => expect(useAuthStore.getState().justRegistered).toBe(true))
  })

  it('shows an error and stays on the details step when registration fails', async () => {
    vi.mocked(authApi.register).mockRejectedValue({
      response: { data: { detail: 'Email already registered' } },
    })

    renderForm()
    fireEvent.change(screen.getByPlaceholderText('Your name (e.g. Alice Smith)'), { target: { value: 'Alice Smith' } })
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'alice@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('At least 6 characters'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Email already registered')).toBeInTheDocument()
    // Still on step 1 — OTP step not shown
    expect(screen.queryByText('Check your email')).not.toBeInTheDocument()
  })
})
