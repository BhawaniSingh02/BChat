import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import ActiveCallView from '../components/call/ActiveCallView'

// Capture a reference so tests can assert stream (re-)attachment calls.
const mockSetSrcObject = vi.fn()
Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
  set: mockSetSrcObject,
  get: vi.fn(),
})

// jsdom does not implement play() — stub it so effects don't throw.
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  value: vi.fn().mockResolvedValue(undefined),
  writable: true,
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
    // username appears in both the header bar and the audio layout body
    expect(screen.getAllByText('bob').length).toBeGreaterThan(0)
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

  // ── Drag handle ───────────────────────────────────────────────────────────

  it('renders a drag handle', () => {
    render(<ActiveCallView {...defaultProps} />)
    expect(screen.getByTestId('drag-handle')).toBeInTheDocument()
  })

  // ── Minimize / expand ─────────────────────────────────────────────────────

  it('renders minimize button', () => {
    render(<ActiveCallView {...defaultProps} />)
    expect(screen.getByTestId('minimize-call-btn')).toBeInTheDocument()
  })

  it('switches to minimized pill when minimize button is clicked', () => {
    render(<ActiveCallView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('minimize-call-btn'))
    expect(screen.getByTestId('expand-call-btn')).toBeInTheDocument()
    // Controls should be hidden in minimized mode
    expect(screen.queryByTestId('mute-btn')).not.toBeInTheDocument()
  })

  it('expands back to full view when expand button is clicked', () => {
    render(<ActiveCallView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('minimize-call-btn'))
    fireEvent.click(screen.getByTestId('expand-call-btn'))
    expect(screen.getByTestId('mute-btn')).toBeInTheDocument()
    expect(screen.queryByTestId('expand-call-btn')).not.toBeInTheDocument()
  })

  it('shows call timer in minimized state', () => {
    render(<ActiveCallView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('minimize-call-btn'))
    expect(screen.getByTestId('call-timer')).toBeInTheDocument()
  })

  it('shows hang-up button in minimized state', () => {
    render(<ActiveCallView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('minimize-call-btn'))
    expect(screen.getByTestId('hangup-btn')).toBeInTheDocument()
  })

  it('hang-up works from minimized state', () => {
    const onHangUp = vi.fn()
    render(<ActiveCallView {...defaultProps} onHangUp={onHangUp} />)
    fireEvent.click(screen.getByTestId('minimize-call-btn'))
    fireEvent.click(screen.getByTestId('hangup-btn'))
    expect(onHangUp).toHaveBeenCalledOnce()
  })

  // ── Remote mute indicator ─────────────────────────────────────────────────

  it('does not show remote muted icon when remoteMuted is false', () => {
    render(<ActiveCallView {...defaultProps} remoteMuted={false} />)
    expect(screen.queryByTestId('remote-muted-icon')).not.toBeInTheDocument()
  })

  it('shows remote muted icon in header when remoteMuted is true', () => {
    render(<ActiveCallView {...defaultProps} remoteMuted={true} />)
    expect(screen.getByTestId('remote-muted-icon')).toBeInTheDocument()
  })

  it('shows remote muted label for audio calls when remoteMuted is true', () => {
    render(<ActiveCallView {...defaultProps} callType="AUDIO" remoteMuted={true} />)
    expect(screen.getByTestId('remote-muted-label')).toBeInTheDocument()
  })

  it('shows remote muted icon in minimized state', () => {
    render(<ActiveCallView {...defaultProps} remoteMuted={true} />)
    fireEvent.click(screen.getByTestId('minimize-call-btn'))
    expect(screen.getByTestId('remote-muted-icon')).toBeInTheDocument()
  })

  // ── Remote camera-off indicator ───────────────────────────────────────────

  it('shows camera-off label when remoteCameraOff is true for video calls', () => {
    render(<ActiveCallView {...defaultProps} callType="VIDEO" remoteCameraOff={true} />)
    expect(screen.getByTestId('remote-camera-off-label')).toBeInTheDocument()
  })

  it('does not show camera-off label when remoteCameraOff is false', () => {
    render(<ActiveCallView {...defaultProps} callType="VIDEO" remoteCameraOff={false} />)
    expect(screen.queryByTestId('remote-camera-off-label')).not.toBeInTheDocument()
  })

  // ── ICE reconnecting banner ───────────────────────────────────────────────

  it('shows reconnecting banner when iceConnectionState is disconnected', () => {
    render(<ActiveCallView {...defaultProps} iceConnectionState="disconnected" />)
    expect(screen.getByTestId('reconnecting-banner')).toBeInTheDocument()
  })

  it('shows reconnecting banner when iceConnectionState is checking', () => {
    render(<ActiveCallView {...defaultProps} iceConnectionState="checking" />)
    expect(screen.getByTestId('reconnecting-banner')).toBeInTheDocument()
  })

  it('does not show reconnecting banner when iceConnectionState is connected', () => {
    render(<ActiveCallView {...defaultProps} iceConnectionState="connected" />)
    expect(screen.queryByTestId('reconnecting-banner')).not.toBeInTheDocument()
  })

  it('does not show reconnecting banner when iceConnectionState is null', () => {
    render(<ActiveCallView {...defaultProps} iceConnectionState={null} />)
    expect(screen.queryByTestId('reconnecting-banner')).not.toBeInTheDocument()
  })

  // ── Mute/camera callbacks ─────────────────────────────────────────────────

  it('calls onMuteToggle with true when mic is muted', () => {
    const onMuteToggle = vi.fn()
    render(<ActiveCallView {...defaultProps} onMuteToggle={onMuteToggle} />)
    fireEvent.click(screen.getByTestId('mute-btn'))
    expect(onMuteToggle).toHaveBeenCalledWith(true)
  })

  it('calls onMuteToggle with false when mic is unmuted', () => {
    const onMuteToggle = vi.fn()
    render(<ActiveCallView {...defaultProps} onMuteToggle={onMuteToggle} />)
    fireEvent.click(screen.getByTestId('mute-btn'))  // mute
    fireEvent.click(screen.getByTestId('mute-btn'))  // unmute
    expect(onMuteToggle).toHaveBeenNthCalledWith(2, false)
  })

  it('calls onCameraToggle with true when camera is turned off', () => {
    const onCameraToggle = vi.fn()
    render(<ActiveCallView {...defaultProps} callType="VIDEO" onCameraToggle={onCameraToggle} />)
    fireEvent.click(screen.getByTestId('camera-btn'))
    expect(onCameraToggle).toHaveBeenCalledWith(true)
  })

  it('does not throw if onMuteToggle is not provided', () => {
    render(<ActiveCallView {...defaultProps} />)
    expect(() => fireEvent.click(screen.getByTestId('mute-btn'))).not.toThrow()
  })

  // ── Always-mounted audio element ──────────────────────────────────────────

  it('renders remote audio element for audio calls', () => {
    render(<ActiveCallView {...defaultProps} callType="AUDIO" />)
    expect(screen.getByTestId('remote-audio')).toBeInTheDocument()
  })

  it('renders remote audio element for video calls', () => {
    render(<ActiveCallView {...defaultProps} callType="VIDEO" />)
    expect(screen.getByTestId('remote-audio')).toBeInTheDocument()
  })

  it('remote audio element remains in DOM when minimized', () => {
    render(<ActiveCallView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('minimize-call-btn'))
    // The audio element must survive minimize so audio continues uninterrupted
    expect(screen.getByTestId('remote-audio')).toBeInTheDocument()
  })

  it('remote audio element remains in DOM after expand from minimized', () => {
    render(<ActiveCallView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('minimize-call-btn'))
    fireEvent.click(screen.getByTestId('expand-call-btn'))
    expect(screen.getByTestId('remote-audio')).toBeInTheDocument()
  })

  // ── Stream reattachment on expand ─────────────────────────────────────────

  it('reattaches remote stream to audio element after expand from minimized', () => {
    const remoteStream = {
      getVideoTracks: vi.fn().mockReturnValue([]),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaStream

    render(<ActiveCallView {...defaultProps} remoteStream={remoteStream} />)
    // Stream is set on mount
    const initialCalls = mockSetSrcObject.mock.calls.length
    expect(initialCalls).toBeGreaterThan(0)

    mockSetSrcObject.mockClear()
    fireEvent.click(screen.getByTestId('minimize-call-btn'))
    fireEvent.click(screen.getByTestId('expand-call-btn'))

    // Stream must be re-attached after expanding so video/audio are not blank
    expect(mockSetSrcObject).toHaveBeenCalled()
  })

  it('video elements are not visible in minimized state', () => {
    render(<ActiveCallView {...defaultProps} callType="VIDEO" />)
    fireEvent.click(screen.getByTestId('minimize-call-btn'))
    expect(screen.queryByTestId('remote-video')).not.toBeInTheDocument()
    expect(screen.queryByTestId('local-video')).not.toBeInTheDocument()
  })

  it('video elements are visible again after expand', () => {
    render(<ActiveCallView {...defaultProps} callType="VIDEO" />)
    fireEvent.click(screen.getByTestId('minimize-call-btn'))
    fireEvent.click(screen.getByTestId('expand-call-btn'))
    expect(screen.getByTestId('remote-video')).toBeInTheDocument()
    expect(screen.getByTestId('local-video')).toBeInTheDocument()
  })
})
