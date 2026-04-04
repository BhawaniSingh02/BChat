import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import VoiceRecorder from '../../components/chat/VoiceRecorder'

// Mock getUserMedia and MediaRecorder
const mockStop = vi.fn()
const mockStart = vi.fn()
const mockMediaRecorder = {
  ondataavailable: null as ((e: { data: Blob }) => void) | null,
  onstop: null as (() => void) | null,
  start: mockStart,
  stop: mockStop,
  state: 'inactive' as 'inactive' | 'recording',
}

const mockGetUserMedia = vi.fn().mockResolvedValue({
  getTracks: () => [{ stop: vi.fn() }],
})

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
  })
  // @ts-expect-error mock
  global.MediaRecorder = vi.fn(() => mockMediaRecorder)
  // @ts-expect-error mock
  global.MediaRecorder.isTypeSupported = vi.fn(() => true)
  // @ts-expect-error mock
  global.AudioContext = vi.fn(() => ({
    createMediaStreamSource: vi.fn(() => ({ connect: vi.fn() })),
    createAnalyser: vi.fn(() => ({
      fftSize: 64,
      frequencyBinCount: 32,
      getByteFrequencyData: vi.fn(),
    })),
  }))
})

describe('VoiceRecorder', () => {
  it('renders voice recorder UI', () => {
    render(<VoiceRecorder onSend={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByTestId('voice-recorder')).toBeDefined()
    expect(screen.getByTestId('voice-cancel-btn')).toBeDefined()
    expect(screen.getByTestId('voice-send-btn')).toBeDefined()
    expect(screen.getByTestId('voice-timer')).toBeDefined()
  })

  it('shows initial timer at 0:00', () => {
    render(<VoiceRecorder onSend={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByTestId('voice-timer').textContent).toBe('0:00')
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(<VoiceRecorder onSend={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByTestId('voice-cancel-btn'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('send button is disabled initially (recording not started yet)', () => {
    render(<VoiceRecorder onSend={vi.fn()} onCancel={vi.fn()} />)
    const sendBtn = screen.getByTestId('voice-send-btn') as HTMLButtonElement
    // Send button should be disabled before recording is active
    expect(sendBtn.disabled).toBe(true)
  })
})
