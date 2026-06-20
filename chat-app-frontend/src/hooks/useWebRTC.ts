import { useCallback, useRef, useEffect } from 'react'
import { buildAudioConstraints, buildVideoConstraints } from '../utils/mediaPreferences'

// ── Safari detection & H.264 codec preference ─────────────────────────────────
// Safari does not support VP8/VP9. Reordering codecs to prefer H.264 ensures
// video calls negotiate a codec both sides understand.
function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

function preferH264(pc: RTCPeerConnection): void {
  if (!isSafari() || typeof RTCRtpSender.getCapabilities !== 'function') return
  const caps = RTCRtpSender.getCapabilities('video')
  if (!caps) return
  const h264 = caps.codecs.filter(c => c.mimeType.toLowerCase() === 'video/h264')
  const rest = caps.codecs.filter(c => c.mimeType.toLowerCase() !== 'video/h264')
  const preferred = [...h264, ...rest]
  pc.getTransceivers().forEach(t => {
    if (t.sender.track?.kind === 'video') {
      try { t.setCodecPreferences(preferred) } catch { /* unsupported in older Safari */ }
    }
  })
}

// ── ICE server configuration ──────────────────────────────────────────────────
// STUN: free Google STUN servers for NAT traversal in most networks.
// TURN: required for ~15% of connections behind symmetric NAT/firewalls.
//       Set VITE_TURN_URL / VITE_TURN_USERNAME / VITE_TURN_CREDENTIAL in .env
//       (e.g. using Metered, Twilio, or a self-hosted Coturn server).
function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]

  const turnUrl = import.meta.env.VITE_TURN_URL as string | undefined
  const turnUsername = import.meta.env.VITE_TURN_USERNAME as string | undefined
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined

  if (turnUrl && turnUsername && turnCredential) {
    // Custom/self-hosted TURN takes priority.
    servers.push({ urls: turnUrl, username: turnUsername, credential: turnCredential })
  } else {
    // Free public TURN fallback (OpenRelay/Metered). Without a relay, calls
    // between users on different networks behind symmetric NAT often end up with
    // one-way or no audio. This guarantees a relay path out of the box; for
    // production scale, set the VITE_TURN_* env vars to your own TURN server.
    servers.push(
      { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
    )
  }

  return servers
}

const ICE_SERVERS = buildIceServers()

// How long to wait after ICE "disconnected" before attempting a restart (ms)
const ICE_RECONNECT_DELAY_MS = 5000
// How long to wait after ICE restart before giving up (ms)
const ICE_RESTART_TIMEOUT_MS = 10000

export interface WebRTCHandlers {
  /** Called with a local ICE candidate to relay via STOMP */
  onIceCandidate: (candidateJson: string) => void
  /** Called when the remote media stream is ready */
  onRemoteStream: (stream: MediaStream) => void
  /** Called when the peer connection closes unexpectedly */
  onConnectionClosed: () => void
  /** Called with a new offer SDP when *this* peer initiates an ICE restart */
  onIceRestartOffer?: (offerSdpJson: string) => void
  /** Called with an answer SDP when *this* peer responds to a remote ICE restart offer */
  onIceRestartAnswer?: (answerSdpJson: string) => void
  /** Called whenever the ICE connection state changes — useful for UI indicators */
  onIceStateChange?: (state: RTCIceConnectionState) => void
}

/**
 * Translate a raw getUserMedia / device error into a user-facing message.
 * Exported so callers can surface a helpful toast instead of failing silently.
 */
export function describeMediaError(err: unknown): string {
  const name = (err as { name?: string })?.name
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera/microphone permission was denied. Please allow access and try again.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera or microphone was found on this device.'
    case 'NotReadableError':
      return 'Your camera or microphone is already in use by another application.'
    default:
      if (typeof window !== 'undefined' && window.isSecureContext === false) {
        return 'Calls require a secure (HTTPS) connection. Open the app over HTTPS or localhost.'
      }
      return 'Could not start the call. Check your camera/microphone and try again.'
  }
}

export function useWebRTC(handlers: WebRTCHandlers) {
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  // Timers for ICE reconnection
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Always-current handlers ref — prevents stale closures in PC event callbacks
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  const clearReconnectTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current)
      restartTimeoutRef.current = null
    }
  }, [])

  const cleanup = useCallback(() => {
    clearReconnectTimers()
    pendingIceCandidatesRef.current = []
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    remoteStreamRef.current = null
    pcRef.current?.close()
    pcRef.current = null
  }, [clearReconnectTimers])

  const flushPendingIceCandidates = useCallback(async () => {
    const pc = pcRef.current
    if (!pc?.remoteDescription || pendingIceCandidatesRef.current.length === 0) return

    const queued = [...pendingIceCandidatesRef.current]
    pendingIceCandidatesRef.current = []

    for (const candidateInit of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidateInit))
      } catch {
        // Ignore stale or duplicate candidates that can appear during reconnects.
      }
    }
  }, [])

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    const remoteStream = new MediaStream()
    remoteStreamRef.current = remoteStream

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        handlersRef.current.onIceCandidate(JSON.stringify(e.candidate.toJSON()))
      }
    }

    pc.ontrack = (e) => {
      // Always funnel all tracks into our own managed stream so we hold a stable
      // object reference across multiple ontrack fires (audio + video arrive separately).
      const managed = remoteStreamRef.current
      if (!managed) return
      if (e.streams[0]) {
        e.streams[0].getTracks().forEach((t) => {
          if (!managed.getTrackById(t.id)) managed.addTrack(t)
        })
      } else {
        if (!managed.getTrackById(e.track.id)) managed.addTrack(e.track)
      }
      handlersRef.current.onRemoteStream(managed)
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      if (state === 'failed') {
        clearReconnectTimers()
        handlersRef.current.onConnectionClosed()
      }
    }

    // ICE connection state — attempt reconnection before giving up
    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState
      handlersRef.current.onIceStateChange?.(iceState)

      if (iceState === 'disconnected') {
        reconnectTimerRef.current = setTimeout(async () => {
          if (!pcRef.current || pcRef.current.iceConnectionState !== 'disconnected') return
          try {
            const offer = await pcRef.current.createOffer({ iceRestart: true })
            await pcRef.current.setLocalDescription(offer)
            handlersRef.current.onIceRestartOffer?.(JSON.stringify(offer))

            restartTimeoutRef.current = setTimeout(() => {
              if (
                pcRef.current &&
                (pcRef.current.iceConnectionState === 'disconnected' ||
                  pcRef.current.iceConnectionState === 'failed')
              ) {
                handlersRef.current.onConnectionClosed()
              }
            }, ICE_RESTART_TIMEOUT_MS)
          } catch {
            handlersRef.current.onConnectionClosed()
          }
        }, ICE_RECONNECT_DELAY_MS)
      }

      if (iceState === 'connected' || iceState === 'completed') {
        clearReconnectTimers()
      }

      if (iceState === 'failed') {
        clearReconnectTimers()
        handlersRef.current.onConnectionClosed()
      }
    }

    pcRef.current = pc
    return pc
  }, [clearReconnectTimers])

  /**
   * Caller: acquire local media, create offer, return SDP string.
   */
  const startCall = useCallback(async (withVideo: boolean): Promise<string> => {
    cleanup()
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: buildAudioConstraints(),
      video: buildVideoConstraints(withVideo),
    })
    localStreamRef.current = stream

    const pc = createPeerConnection()
    stream.getTracks().forEach((t) => pc.addTrack(t, stream))
    preferH264(pc)

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    return JSON.stringify(offer)
  }, [cleanup, createPeerConnection])

  /**
   * Callee: acquire local media, set remote offer, create answer, return SDP string.
   */
  const answerCall = useCallback(async (
    offerSdpJson: string,
    withVideo: boolean,
  ): Promise<string> => {
    // Preserve any ICE candidates that arrived while the call was still ringing
    // (before the peer connection existed). cleanup() resets the buffer, so we
    // capture the array reference first and restore it afterwards — otherwise the
    // caller's early candidates would be lost and ICE could never connect.
    const carriedCandidates = pendingIceCandidatesRef.current
    cleanup()
    pendingIceCandidatesRef.current = carriedCandidates
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: buildAudioConstraints(),
      video: buildVideoConstraints(withVideo),
    })
    localStreamRef.current = stream

    const pc = createPeerConnection()
    stream.getTracks().forEach((t) => pc.addTrack(t, stream))

    const offer: RTCSessionDescriptionInit = JSON.parse(offerSdpJson)
    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    await flushPendingIceCandidates()
    preferH264(pc)

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    return JSON.stringify(answer)
  }, [cleanup, createPeerConnection, flushPendingIceCandidates])

  /**
   * Caller: receive the callee's answer SDP.
   */
  const setRemoteAnswer = useCallback(async (answerSdpJson: string) => {
    const pc = pcRef.current
    if (!pc) return
    const answer: RTCSessionDescriptionInit = JSON.parse(answerSdpJson)
    await pc.setRemoteDescription(new RTCSessionDescription(answer))
    await flushPendingIceCandidates()
  }, [flushPendingIceCandidates])

  /**
   * Handle a payload received on the ICE relay channel. This channel carries
   * three kinds of payload, distinguished by the parsed JSON shape:
   *   1. A regular ICE candidate ({@code {candidate, sdpMid, ...}})
   *   2. An ICE-restart offer ({@code {type: 'offer', sdp}}) from the remote peer
   *   3. An ICE-restart answer ({@code {type: 'answer', sdp}}) from the remote peer
   *
   * Candidates that arrive before the peer connection exists or before the
   * remote description is set are buffered and flushed once negotiation is ready.
   * This is essential on the callee side, where the caller's candidates start
   * arriving while the call is still ringing (no peer connection yet).
   */
  const addIceCandidate = useCallback(async (candidateJson: string) => {
    let parsed: RTCSessionDescriptionInit & RTCIceCandidateInit
    try {
      parsed = JSON.parse(candidateJson)
    } catch {
      return // malformed payload
    }

    const pc = pcRef.current

    // ── ICE restart answer (we previously sent a restart offer) ──────────────
    if (parsed.type === 'answer') {
      if (pc && pc.signalingState === 'have-local-offer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(parsed))
          clearReconnectTimers()
          await flushPendingIceCandidates()
        } catch {
          // restart failed; the disconnect timeout will eventually close the call
        }
      }
      return
    }

    // ── ICE restart offer (remote peer is reconnecting) ──────────────────────
    if (parsed.type === 'offer') {
      // Can only respond to a restart on an established connection in a stable
      // state. Ignoring otherwise avoids throwing during glare (both sides restart).
      if (!pc || pc.signalingState !== 'stable') return
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(parsed))
        await flushPendingIceCandidates()
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        handlersRef.current.onIceRestartAnswer?.(JSON.stringify(answer))
      } catch {
        // restart failed; the disconnect timeout will eventually close the call
      }
      return
    }

    // ── Regular ICE candidate ────────────────────────────────────────────────
    // Buffer until both the peer connection and its remote description exist.
    if (!pc || !pc.remoteDescription) {
      pendingIceCandidatesRef.current.push(parsed)
      return
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(parsed))
    } catch {
      // Benign: stale/duplicate candidate
    }
  }, [clearReconnectTimers, flushPendingIceCandidates])

  return {
    localStream: localStreamRef,
    startCall,
    answerCall,
    setRemoteAnswer,
    addIceCandidate,
    cleanup,
  }
}
