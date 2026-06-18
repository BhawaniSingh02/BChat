import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { useWebRTC, describeMediaError, type WebRTCHandlers } from '../hooks/useWebRTC'

// ── WebRTC API mocks ─────────────────────────────────────────────────────────
// jsdom implements none of the WebRTC primitives, so we install controllable
// fakes that let us drive peer-connection lifecycle events from the tests.

class FakeMediaStreamTrack {
  enabled = true
  stop = vi.fn()
  kind: string
  id: string
  constructor(kind: string, id: string) {
    this.kind = kind
    this.id = id
  }
}

class FakeMediaStream {
  private _tracks: FakeMediaStreamTrack[]
  constructor(tracks: FakeMediaStreamTrack[] = []) {
    this._tracks = tracks
  }
  getTracks() { return this._tracks }
  getAudioTracks() { return this._tracks.filter((t) => t.kind === 'audio') }
  getVideoTracks() { return this._tracks.filter((t) => t.kind === 'video') }
  getTrackById(id: string) { return this._tracks.find((t) => t.id === id) ?? null }
  addTrack(t: FakeMediaStreamTrack) { if (!this.getTrackById(t.id)) this._tracks.push(t) }
  addEventListener() {}
  removeEventListener() {}
}

const createdPCs: FakeRTCPeerConnection[] = []

class FakeRTCPeerConnection {
  signalingState: RTCSignalingState = 'stable'
  iceConnectionState: RTCIceConnectionState = 'new'
  connectionState: RTCPeerConnectionState = 'new'
  remoteDescription: RTCSessionDescriptionInit | null = null
  localDescription: RTCSessionDescriptionInit | null = null
  addedIceCandidates: unknown[] = []
  addedTracks: unknown[] = []
  lastOfferOpts: RTCOfferOptions | undefined
  onicecandidate: ((e: { candidate: { toJSON: () => unknown } | null }) => void) | null = null
  ontrack: ((e: { streams: FakeMediaStream[]; track: FakeMediaStreamTrack }) => void) | null = null
  onconnectionstatechange: (() => void) | null = null
  oniceconnectionstatechange: (() => void) | null = null
  close = vi.fn()
  config: RTCConfiguration

  constructor(config: RTCConfiguration) {
    this.config = config
    createdPCs.push(this)
  }
  addTrack(t: unknown) { this.addedTracks.push(t) }
  async createOffer(opts?: RTCOfferOptions) { this.lastOfferOpts = opts; return { type: 'offer', sdp: 'offer-sdp' } }
  async createAnswer() { return { type: 'answer', sdp: 'answer-sdp' } }
  async setLocalDescription(desc: RTCSessionDescriptionInit) {
    this.localDescription = desc
    this.signalingState = desc.type === 'offer' ? 'have-local-offer' : 'stable'
  }
  async setRemoteDescription(desc: RTCSessionDescriptionInit) {
    this.remoteDescription = desc
    this.signalingState = desc.type === 'offer' ? 'have-remote-offer' : 'stable'
  }
  async addIceCandidate(c: unknown) { this.addedIceCandidates.push(c) }
  getTransceivers() { return [] }
}

const getUserMedia = vi.fn(async ({ audio, video }: { audio?: unknown; video?: unknown }) => {
  const tracks: FakeMediaStreamTrack[] = []
  if (audio) tracks.push(new FakeMediaStreamTrack('audio', 'a1'))
  if (video) tracks.push(new FakeMediaStreamTrack('video', 'v1'))
  return new FakeMediaStream(tracks)
})

beforeEach(() => {
  createdPCs.length = 0
  getUserMedia.mockClear()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).MediaStream = FakeMediaStream
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).RTCPeerConnection = FakeRTCPeerConnection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).RTCIceCandidate = class {
    init: unknown
    constructor(init: unknown) { this.init = init }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).RTCSessionDescription = class {
    type?: string
    sdp?: string
    constructor(init: RTCSessionDescriptionInit) { Object.assign(this, init) }
  }
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia },
    configurable: true,
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

function setup(overrides: Partial<WebRTCHandlers> = {}) {
  const handlers: WebRTCHandlers = {
    onIceCandidate: vi.fn(),
    onRemoteStream: vi.fn(),
    onConnectionClosed: vi.fn(),
    onIceRestartOffer: vi.fn(),
    onIceRestartAnswer: vi.fn(),
    onIceStateChange: vi.fn(),
    ...overrides,
  }
  const { result, unmount } = renderHook(() => useWebRTC(handlers))
  return { handlers, result, unmount }
}

describe('useWebRTC — Bug 1: inbound ICE candidate buffering', () => {
  it('buffers candidates that arrive before the peer connection exists (callee, still ringing), then applies them on answer', async () => {
    const { result } = setup()
    const candidate = JSON.stringify({ candidate: 'cand-before-accept', sdpMid: '0' })

    // Candidate arrives while the call is ringing — no PC yet. Must not throw or be lost.
    await act(async () => { await result.current.addIceCandidate(candidate) })
    expect(createdPCs.length).toBe(0)

    // Callee accepts → PC created, remote offer set, buffered candidate replayed.
    await act(async () => {
      await result.current.answerCall(JSON.stringify({ type: 'offer', sdp: 'remote-offer' }), false)
    })

    const pc = createdPCs[0]
    expect(pc).toBeDefined()
    expect(pc.addedIceCandidates.length).toBe(1)
  })

  it('buffers multiple early candidates and flushes all of them on answer', async () => {
    const { result } = setup()
    await act(async () => {
      await result.current.addIceCandidate(JSON.stringify({ candidate: 'c1' }))
      await result.current.addIceCandidate(JSON.stringify({ candidate: 'c2' }))
      await result.current.addIceCandidate(JSON.stringify({ candidate: 'c3' }))
    })
    await act(async () => {
      await result.current.answerCall(JSON.stringify({ type: 'offer', sdp: 'o' }), false)
    })
    expect(createdPCs[0].addedIceCandidates.length).toBe(3)
  })

  it('buffers candidates on the caller side until the remote answer is set', async () => {
    const { result } = setup()
    await act(async () => { await result.current.startCall(false) })
    const pc = createdPCs[0]

    // Remote description not set yet → candidate must be buffered, not applied.
    await act(async () => { await result.current.addIceCandidate(JSON.stringify({ candidate: 'early' })) })
    expect(pc.addedIceCandidates.length).toBe(0)

    await act(async () => { await result.current.setRemoteAnswer(JSON.stringify({ type: 'answer', sdp: 'a' })) })
    expect(pc.addedIceCandidates.length).toBe(1)
  })

  it('applies candidates immediately once the connection is ready', async () => {
    const { result } = setup()
    await act(async () => { await result.current.startCall(false) })
    await act(async () => { await result.current.setRemoteAnswer(JSON.stringify({ type: 'answer', sdp: 'a' })) })
    const pc = createdPCs[0]
    await act(async () => { await result.current.addIceCandidate(JSON.stringify({ candidate: 'live' })) })
    expect(pc.addedIceCandidates.length).toBe(1)
  })
})

describe('useWebRTC — Bug 2: ICE restart', () => {
  it('responds to an incoming ICE-restart offer with an answer', async () => {
    const { result, handlers } = setup()
    await act(async () => { await result.current.startCall(false) })
    await act(async () => { await result.current.setRemoteAnswer(JSON.stringify({ type: 'answer', sdp: 'a' })) })
    const pc = createdPCs[0]
    expect(pc.signalingState).toBe('stable')

    await act(async () => {
      await result.current.addIceCandidate(JSON.stringify({ type: 'offer', sdp: 'restart-offer' }))
    })

    expect(handlers.onIceRestartAnswer).toHaveBeenCalledTimes(1)
    const answerArg = (handlers.onIceRestartAnswer as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(JSON.parse(answerArg).type).toBe('answer')
    // The remote restart offer was applied.
    expect(pc.remoteDescription?.sdp).toBe('restart-offer')
  })

  it('ignores a restart offer when not in a stable state (glare protection)', async () => {
    const { result, handlers } = setup()
    await act(async () => { await result.current.startCall(false) })
    const pc = createdPCs[0]
    expect(pc.signalingState).toBe('have-local-offer') // mid-negotiation, not stable

    await act(async () => {
      await result.current.addIceCandidate(JSON.stringify({ type: 'offer', sdp: 'glare-offer' }))
    })
    expect(handlers.onIceRestartAnswer).not.toHaveBeenCalled()
  })

  it('applies an incoming ICE-restart answer while awaiting one', async () => {
    const { result } = setup()
    await act(async () => { await result.current.startCall(false) })
    const pc = createdPCs[0]
    expect(pc.signalingState).toBe('have-local-offer')

    await act(async () => {
      await result.current.addIceCandidate(JSON.stringify({ type: 'answer', sdp: 'restart-answer' }))
    })
    expect(pc.remoteDescription?.sdp).toBe('restart-answer')
  })

  it('initiates an ICE restart after the connection stays disconnected', async () => {
    vi.useFakeTimers()
    const { result, handlers } = setup()
    await act(async () => { await result.current.startCall(false) })
    await act(async () => { await result.current.setRemoteAnswer(JSON.stringify({ type: 'answer', sdp: 'a' })) })
    const pc = createdPCs[0]

    pc.iceConnectionState = 'disconnected'
    act(() => { pc.oniceconnectionstatechange?.() })
    expect(handlers.onIceStateChange).toHaveBeenCalledWith('disconnected')

    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })

    expect(pc.lastOfferOpts).toEqual({ iceRestart: true })
    expect(handlers.onIceRestartOffer).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('does not restart if the connection recovers before the delay', async () => {
    vi.useFakeTimers()
    const { result, handlers } = setup()
    await act(async () => { await result.current.startCall(false) })
    await act(async () => { await result.current.setRemoteAnswer(JSON.stringify({ type: 'answer', sdp: 'a' })) })
    const pc = createdPCs[0]

    pc.iceConnectionState = 'disconnected'
    act(() => { pc.oniceconnectionstatechange?.() })
    // Recovers before the 5s restart timer fires
    pc.iceConnectionState = 'connected'
    act(() => { pc.oniceconnectionstatechange?.() })

    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(handlers.onIceRestartOffer).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})

describe('useWebRTC — signaling basics', () => {
  it('startCall acquires media, creates an offer and returns the SDP', async () => {
    const { result } = setup()
    let offer = ''
    await act(async () => { offer = await result.current.startCall(true) })
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ video: true }))
    expect(JSON.parse(offer).type).toBe('offer')
    expect(createdPCs[0].addedTracks.length).toBe(2) // audio + video
  })

  it('answerCall returns an answer SDP', async () => {
    const { result } = setup()
    let answer = ''
    await act(async () => {
      answer = await result.current.answerCall(JSON.stringify({ type: 'offer', sdp: 'o' }), false)
    })
    expect(JSON.parse(answer).type).toBe('answer')
  })

  it('relays locally-gathered ICE candidates', async () => {
    const { result, handlers } = setup()
    await act(async () => { await result.current.startCall(false) })
    const pc = createdPCs[0]
    act(() => { pc.onicecandidate?.({ candidate: { toJSON: () => ({ candidate: 'local' }) } }) })
    expect(handlers.onIceCandidate).toHaveBeenCalledTimes(1)
  })

  it('does not relay the null end-of-candidates marker', async () => {
    const { result, handlers } = setup()
    await act(async () => { await result.current.startCall(false) })
    const pc = createdPCs[0]
    act(() => { pc.onicecandidate?.({ candidate: null }) })
    expect(handlers.onIceCandidate).not.toHaveBeenCalled()
  })

  it('surfaces the remote stream when a track arrives', async () => {
    const { result, handlers } = setup()
    await act(async () => { await result.current.startCall(true) })
    const pc = createdPCs[0]
    act(() => { pc.ontrack?.({ streams: [], track: new FakeMediaStreamTrack('video', 'rv') }) })
    expect(handlers.onRemoteStream).toHaveBeenCalledTimes(1)
  })

  it('calls onConnectionClosed when the connection fails', async () => {
    const { result, handlers } = setup()
    await act(async () => { await result.current.startCall(false) })
    const pc = createdPCs[0]
    pc.connectionState = 'failed'
    act(() => { pc.onconnectionstatechange?.() })
    expect(handlers.onConnectionClosed).toHaveBeenCalledTimes(1)
  })

  it('cleanup stops local tracks and closes the peer connection', async () => {
    const { result } = setup()
    await act(async () => { await result.current.startCall(true) })
    const pc = createdPCs[0]
    act(() => { result.current.cleanup() })
    expect(pc.close).toHaveBeenCalled()
  })

  it('ignores malformed ICE payloads without throwing', async () => {
    const { result } = setup()
    await act(async () => { await result.current.startCall(false) })
    await expect(
      act(async () => { await result.current.addIceCandidate('not-json') }),
    ).resolves.not.toThrow()
  })
})

describe('describeMediaError', () => {
  it('maps permission denial to a clear message', () => {
    expect(describeMediaError({ name: 'NotAllowedError' })).toMatch(/permission/i)
    expect(describeMediaError({ name: 'SecurityError' })).toMatch(/permission/i)
  })
  it('maps missing devices', () => {
    expect(describeMediaError({ name: 'NotFoundError' })).toMatch(/no camera or microphone/i)
  })
  it('maps a device already in use', () => {
    expect(describeMediaError({ name: 'NotReadableError' })).toMatch(/already in use/i)
  })
  it('falls back to a generic message for unknown errors', () => {
    expect(describeMediaError(new Error('boom'))).toBeTruthy()
    expect(describeMediaError(undefined)).toBeTruthy()
  })
})
