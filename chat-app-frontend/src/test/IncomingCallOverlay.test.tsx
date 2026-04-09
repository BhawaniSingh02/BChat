import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
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

  // ── Countdown & auto-decline ───────────────────────────────────────────────

  it('shows countdown element', () => {
    render(<IncomingCallOverlay {...defaultProps} />)
    expect(screen.getByTestId('ring-countdown')).toBeInTheDocument()
  })

  it('displays the initial countdown value', () => {
    render(<IncomingCallOverlay {...defaultProps} timeoutSeconds={30} />)
    expect(screen.getByTestId('ring-countdown')).toHaveTextContent('30')
  })

  describe('with fake timers', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('decrements countdown each second', () => {
      render(<IncomingCallOverlay {...defaultProps} timeoutSeconds={10} />)
      act(() => { vi.advanceTimersByTime(3000) })
      expect(screen.getByTestId('ring-countdown')).toHaveTextContent('7')
    })

    it('calls onDecline automatically when countdown reaches zero', () => {
      const onDecline = vi.fn()
      render(<IncomingCallOverlay {...defaultProps} onDecline={onDecline} timeoutSeconds={5} />)
      act(() => { vi.advanceTimersByTime(5000) })
      expect(onDecline).toHaveBeenCalledOnce()
    })

    it('does not call onDecline before timeout elapses', () => {
      const onDecline = vi.fn()
      render(<IncomingCallOverlay {...defaultProps} onDecline={onDecline} timeoutSeconds={10} />)
      act(() => { vi.advanceTimersByTime(4000) })
      expect(onDecline).not.toHaveBeenCalled()
    })

    it('does not auto-decline when timeoutSeconds is 0', () => {
      const onDecline = vi.fn()
      render(<IncomingCallOverlay {...defaultProps} onDecline={onDecline} timeoutSeconds={0} />)
      act(() => { vi.advanceTimersByTime(10000) })
      expect(onDecline).not.toHaveBeenCalled()
    })
  })
})
