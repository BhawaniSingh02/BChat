import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import VoiceRecorder from '../../components/chat/VoiceRecorder'
import { uploadApi } from '../../api/upload'

vi.mock('../../api/upload', () => ({
  uploadApi: { uploadFile: vi.fn() },
}))

// Mock getUserMedia and MediaRecorder
const mockStart = vi.fn(() => { mockMediaRecorder.state = 'recording' })
const mockStop = vi.fn(() => {
  mockMediaRecorder.state = 'inactive'
  mockMediaRecorder.onstop?.()
})
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
  mockMediaRecorder.state = 'inactive'
  mockMediaRecorder.onstop = null
  mockMediaRecorder.ondataavailable = null
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
  })
  // @ts-expect-error mock — must be a real function/class (not an arrow fn) so `new MediaRecorder()` works
  globalThis.MediaRecorder = vi.fn(function MediaRecorderMock() { return mockMediaRecorder })

  globalThis.MediaRecorder.isTypeSupported = vi.fn(() => true)
  // @ts-expect-error mock — must be a real function/class (not an arrow fn) so `new AudioContext()` works
  globalThis.AudioContext = vi.fn(function AudioContextMock() {
    return {
      createMediaStreamSource: vi.fn(() => ({ connect: vi.fn() })),
      createAnalyser: vi.fn(() => ({
        fftSize: 64,
        frequencyBinCount: 32,
        getByteFrequencyData: vi.fn(),
      })),
      decodeAudioData: vi.fn().mockResolvedValue({
        getChannelData: () => new Float32Array(100).fill(0.5),
      }),
      close: vi.fn(),
    }
  })
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

  describe('upload retry', () => {
    it('shows a retry button after a failed upload and resends the same recording on retry', async () => {
      const onSend = vi.fn()
      const uploadFile = uploadApi.uploadFile as unknown as ReturnType<typeof vi.fn>
      uploadFile
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ url: 'https://res.cloudinary.com/demo/voice.mp3', messageType: 'AUDIO', bytes: 123 })

      render(<VoiceRecorder onSend={onSend} onCancel={vi.fn()} />)

      // Wait for recording to actually start (async getUserMedia resolution)
      await waitFor(() => {
        expect((screen.getByTestId('voice-send-btn') as HTMLButtonElement).disabled).toBe(false)
      })

      // Simulate some recorded audio data so the blob isn't empty on stop
      mockMediaRecorder.ondataavailable?.({ data: new Blob(['audio-bytes']) })

      fireEvent.click(screen.getByTestId('voice-send-btn'))

      // First upload attempt fails — error banner + retry button appear, onSend not called
      await waitFor(() => {
        expect(screen.getByTestId('voice-error')).toBeDefined()
        expect(screen.getByTestId('voice-retry-btn')).toBeDefined()
      })
      expect(onSend).not.toHaveBeenCalled()
      expect(uploadFile).toHaveBeenCalledTimes(1)

      fireEvent.click(screen.getByTestId('voice-retry-btn'))

      // Retry re-uploads the same recorded blob and succeeds
      await waitFor(() => {
        expect(onSend).toHaveBeenCalledTimes(1)
      })
      expect(uploadFile).toHaveBeenCalledTimes(2)
      expect(onSend).toHaveBeenCalledWith('https://res.cloudinary.com/demo/voice.mp3', expect.any(Number), expect.any(Array))

      // Both upload attempts should have used the same recorded File (same size/content)
      const firstFile = uploadFile.mock.calls[0][0] as File
      const secondFile = uploadFile.mock.calls[1][0] as File
      expect(secondFile.size).toBe(firstFile.size)
    })

    it('does not show a retry button while there is no recorded blob to retry', () => {
      render(<VoiceRecorder onSend={vi.fn()} onCancel={vi.fn()} />)
      expect(screen.queryByTestId('voice-retry-btn')).toBeNull()
    })
  })
})
