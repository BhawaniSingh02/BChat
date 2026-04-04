import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import OutgoingCallView from '../components/call/OutgoingCallView'

describe('OutgoingCallView', () => {
  const defaultProps = {
    calleeUsername: 'bob',
    callType: 'AUDIO' as const,
    onCancel: vi.fn(),
  }

  it('renders the outgoing call view', () => {
    render(<OutgoingCallView {...defaultProps} />)
    expect(screen.getByTestId('outgoing-call-view')).toBeInTheDocument()
  })

  it('shows the callee username', () => {
    render(<OutgoingCallView {...defaultProps} />)
    expect(screen.getByTestId('outgoing-callee-name')).toHaveTextContent('bob')
  })

  it('shows "Calling" label', () => {
    render(<OutgoingCallView {...defaultProps} />)
    expect(screen.getByTestId('calling-label')).toBeInTheDocument()
  })

  it('shows "Audio call" label for audio calls', () => {
    render(<OutgoingCallView {...defaultProps} callType="AUDIO" />)
    expect(screen.getByText(/audio call/i)).toBeInTheDocument()
  })

  it('shows "Video call" label for video calls', () => {
    render(<OutgoingCallView {...defaultProps} callType="VIDEO" />)
    expect(screen.getByText(/video call/i)).toBeInTheDocument()
  })

  it('shows cancel button', () => {
    render(<OutgoingCallView {...defaultProps} />)
    expect(screen.getByTestId('cancel-outgoing-call-btn')).toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(<OutgoingCallView {...defaultProps} onCancel={onCancel} />)
    fireEvent.click(screen.getByTestId('cancel-outgoing-call-btn'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('has proper aria role for accessibility', () => {
    render(<OutgoingCallView {...defaultProps} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('has correct aria-label reflecting callee name', () => {
    render(<OutgoingCallView {...defaultProps} />)
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Calling bob…')
  })
})
