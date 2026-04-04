import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import ActiveCallView from '../components/call/ActiveCallView'

// Mock HTMLMediaElement.srcObject assignment (jsdom doesn't support it)
Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
  set: vi.fn(),
  get: vi.fn(),
})

// Mock requestAnimationFrame / cancel for setInterval tests
vi.useFakeTimers()

describe('ActiveCallView', () => {
  const defaultProps = {
    otherUsername: 'bob',
    callType: 'AUDIO' as const,
    localStream: null,
    remoteStream: null,
    onHangUp: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  it('renders the active call view', () => {
    render(<ActiveCallView {...defaultProps} />)
    expect(screen.getByTestId('active-call-view')).toBeInTheDocument()
  })

  it('shows the other username', () => {
    render(<ActiveCallView {...defaultProps} />)
    expect(screen.getByText('bob')).toBeInTheDocument()
  })

  it('starts timer at 00:00', () => {
    render(<ActiveCallView {...defaultProps} />)
    expect(screen.getByTestId('call-timer')).toHaveTextContent('00:00')
  })

  it('increments timer every second', () => {
    render(<ActiveCallView {...defaultProps} />)
    act(() => { vi.advanceTimersByTime(3000) })
    expect(screen.getByTestId('call-timer')).toHaveTextContent('00:03')
  })

  it('formats time correctly at 90 seconds', () => {
    render(<ActiveCallView {...defaultProps} />)
    act(() => { vi.advanceTimersByTime(90000) })
    expect(screen.getByTestId('call-timer')).toHaveTextContent('01:30')
  })

  it('calls onHangUp when hang up button is clicked', () => {
    const onHangUp = vi.fn()
    render(<ActiveCallView {...defaultProps} onHangUp={onHangUp} />)
    fireEvent.click(screen.getByTestId('hangup-btn'))
    expect(onHangUp).toHaveBeenCalledOnce()
  })

  it('shows mute button', () => {
    render(<ActiveCallView {...defaultProps} />)
    expect(screen.getByTestId('mute-btn')).toBeInTheDocument()
  })

  it('does not show camera button for audio calls', () => {
    render(<ActiveCallView {...defaultProps} callType="AUDIO" />)
    expect(screen.queryByTestId('camera-btn')).not.toBeInTheDocument()
  })

  it('shows camera button for video calls', () => {
    render(<ActiveCallView {...defaultProps} callType="VIDEO" />)
    expect(screen.getByTestId('camera-btn')).toBeInTheDocument()
  })

  it('toggles mute state when mute button clicked', () => {
    const mockStream = {
      getAudioTracks: vi.fn().mockReturnValue([{ enabled: true }]),
      getVideoTracks: vi.fn().mockReturnValue([]),
    } as unknown as MediaStream
    render(<ActiveCallView {...defaultProps} localStream={mockStream} />)
    const muteBtn = screen.getByTestId('mute-btn')
    expect(muteBtn).toHaveAttribute('aria-label', 'Mute microphone')
    fireEvent.click(muteBtn)
    expect(muteBtn).toHaveAttribute('aria-label', 'Unmute microphone')
  })

  it('shows video-related elements for video calls', () => {
    render(<ActiveCallView {...defaultProps} callType="VIDEO" />)
    expect(screen.getByTestId('remote-video')).toBeInTheDocument()
    expect(screen.getByTestId('local-video')).toBeInTheDocument()
  })

  it('has accessible dialog role', () => {
    render(<ActiveCallView {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows fullscreen button for video calls', () => {
    render(<ActiveCallView {...defaultProps} callType="VIDEO" />)
    expect(screen.getByTestId('fullscreen-btn')).toBeInTheDocument()
  })

  it('does not show fullscreen button for audio calls', () => {
    render(<ActiveCallView {...defaultProps} callType="AUDIO" />)
    expect(screen.queryByTestId('fullscreen-btn')).not.toBeInTheDocument()
  })

  it('fullscreen button has correct aria-label when not fullscreen', () => {
    render(<ActiveCallView {...defaultProps} callType="VIDEO" />)
    expect(screen.getByTestId('fullscreen-btn')).toHaveAttribute('aria-label', 'Enter full screen')
  })
})
