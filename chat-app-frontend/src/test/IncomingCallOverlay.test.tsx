import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import IncomingCallOverlay from '../components/call/IncomingCallOverlay'

describe('IncomingCallOverlay', () => {
  const defaultProps = {
    callerUsername: 'alice',
    callType: 'AUDIO' as const,
    onAccept: vi.fn(),
    onDecline: vi.fn(),
  }

  it('renders with caller username and call type', () => {
    render(<IncomingCallOverlay {...defaultProps} />)
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText(/incoming audio call/i)).toBeInTheDocument()
  })

  it('shows VIDEO in the header for video calls', () => {
    render(<IncomingCallOverlay {...defaultProps} callType="VIDEO" />)
    expect(screen.getByText(/incoming video call/i)).toBeInTheDocument()
  })

  it('calls onAccept when Accept is clicked', () => {
    const onAccept = vi.fn()
    render(<IncomingCallOverlay {...defaultProps} onAccept={onAccept} />)
    fireEvent.click(screen.getByTestId('accept-call-btn'))
    expect(onAccept).toHaveBeenCalledOnce()
  })

  it('calls onDecline when Decline is clicked', () => {
    const onDecline = vi.fn()
    render(<IncomingCallOverlay {...defaultProps} onDecline={onDecline} />)
    fireEvent.click(screen.getByTestId('decline-call-btn'))
    expect(onDecline).toHaveBeenCalledOnce()
  })

  it('has proper aria roles for accessibility', () => {
    render(<IncomingCallOverlay {...defaultProps} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('shows incoming call overlay testid', () => {
    render(<IncomingCallOverlay {...defaultProps} />)
    expect(screen.getByTestId('incoming-call-overlay')).toBeInTheDocument()
  })
})
