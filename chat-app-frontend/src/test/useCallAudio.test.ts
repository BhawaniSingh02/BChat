import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  startRingtone,
  startDialTone,
  playConnectedChime,
  playHangUpTone,
} from '../hooks/useCallAudio'

// Web Audio API is not available in jsdom — mock AudioContext
const mockOscillator = {
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  type: 'sine' as OscillatorType,
  frequency: { setValueAtTime: vi.fn() },
}
const mockGain = {
  connect: vi.fn(),
  gain: {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  },
}
const mockCtx = {
  createOscillator: vi.fn(() => mockOscillator),
  createGain: vi.fn(() => mockGain),
  destination: {},
  currentTime: 0,
  state: 'running',
}

beforeEach(() => {
  vi.clearAllMocks()
  // Use a regular function (not arrow) so it works correctly as a constructor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).AudioContext = vi.fn(function () { return mockCtx })
})

describe('startRingtone', () => {
  it('returns a stop function', () => {
    vi.useFakeTimers()
    const stop = startRingtone()
    expect(typeof stop).toBe('function')
    stop()
    vi.useRealTimers()
  })

  it('stop function prevents further oscillators', () => {
    vi.useFakeTimers()
    mockCtx.createOscillator.mockClear()
    const stop = startRingtone()
    stop()
    const countBefore = mockCtx.createOscillator.mock.calls.length
    vi.advanceTimersByTime(5000)
    // No additional oscillators should be created after stop
    expect(mockCtx.createOscillator.mock.calls.length).toBe(countBefore)
    vi.useRealTimers()
  })
})

describe('startDialTone', () => {
  it('returns a stop function', () => {
    vi.useFakeTimers()
    const stop = startDialTone()
    expect(typeof stop).toBe('function')
    stop()
    vi.useRealTimers()
  })
})

describe('playConnectedChime', () => {
  it('creates oscillators without throwing', () => {
    expect(() => playConnectedChime()).not.toThrow()
  })

  it('calls createOscillator at least once', () => {
    // Clear before calling so we can measure isolated calls
    mockCtx.createOscillator.mockClear()
    // Force fresh AudioContext by closing the cached one
    mockCtx.state = 'closed'
    playConnectedChime()
    mockCtx.state = 'running'
    expect(mockCtx.createOscillator.mock.calls.length).toBeGreaterThanOrEqual(1)
  })
})

describe('playHangUpTone', () => {
  it('creates oscillators without throwing', () => {
    expect(() => playHangUpTone()).not.toThrow()
  })

  it('calls createOscillator at least once', () => {
    mockCtx.createOscillator.mockClear()
    mockCtx.state = 'closed'
    playHangUpTone()
    mockCtx.state = 'running'
    expect(mockCtx.createOscillator.mock.calls.length).toBeGreaterThanOrEqual(1)
  })
})

describe('audio fallback', () => {
  it('silently ignores errors when AudioContext is unavailable', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).AudioContext = vi.fn(() => { throw new Error('Not supported') })
    expect(() => playConnectedChime()).not.toThrow()
    expect(() => playHangUpTone()).not.toThrow()
  })
})
