import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import VideoVoicePanel from '../../components/ui/settings/VideoVoicePanel'
import { getPreferredMicId } from '../../utils/mediaPreferences'

const devices = [
  { deviceId: 'mic-1', kind: 'audioinput', label: 'Built-in Mic' },
  { deviceId: 'cam-1', kind: 'videoinput', label: 'FaceTime Camera' },
  { deviceId: 'spk-1', kind: 'audiooutput', label: 'Built-in Speaker' },
]

describe('VideoVoicePanel', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        enumerateDevices: vi.fn().mockResolvedValue(devices),
        getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    })
  })

  afterEach(() => {
    // @ts-expect-error cleanup test override
    delete navigator.mediaDevices
  })

  it('lists enumerated microphones and cameras', async () => {
    render(<VideoVoicePanel />)
    await waitFor(() => expect(screen.getByText('Built-in Mic')).toBeInTheDocument())
    expect(screen.getByText('FaceTime Camera')).toBeInTheDocument()
  })

  it('persists the chosen microphone', async () => {
    render(<VideoVoicePanel />)
    await waitFor(() => expect(screen.getByText('Built-in Mic')).toBeInTheDocument())
    fireEvent.change(screen.getByTestId('mic-select'), { target: { value: 'mic-1' } })
    expect(getPreferredMicId()).toBe('mic-1')
  })
})
