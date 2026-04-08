import { useCallback, useEffect, useRef, useState } from 'react'
import type { CallType } from '../../types'
import Avatar from '../ui/Avatar'

interface ActiveCallViewProps {
  otherUsername: string
  callType: CallType
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  otherAvatarUrl?: string
  onHangUp: () => void
}

/**
 * Floating call window shown while a call is active.
 * Shows a video grid for video calls, avatar placeholder for audio-only.
 */
export default function ActiveCallView({
  otherUsername,
  callType,
  localStream,
  remoteStream,
  otherAvatarUrl,
  onHangUp,
}: ActiveCallViewProps) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  const [micMuted, setMicMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isFullScreen, setIsFullScreen] = useState(isMobile && callType === 'VIDEO')
  const [remoteHasVideo, setRemoteHasVideo] = useState(false)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (!remoteStream) { setRemoteHasVideo(false); return }

    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream

    // Check initial track state and listen for new tracks arriving after mount
    setRemoteHasVideo(remoteStream.getVideoTracks().length > 0)
    const onTrackAdded = () => setRemoteHasVideo(remoteStream.getVideoTracks().length > 0)
    remoteStream.addEventListener('addtrack', onTrackAdded)
    return () => remoteStream.removeEventListener('addtrack', onTrackAdded)
  }, [remoteStream])

  // Call timer
  useEffect(() => {
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const toggleMic = () => {
    localStream?.getAudioTracks().forEach((t) => { t.enabled = micMuted })
    setMicMuted((v) => !v)
  }

  const toggleCamera = () => {
    localStream?.getVideoTracks().forEach((t) => { t.enabled = cameraOff })
    setCameraOff((v) => !v)
  }

  const toggleFullScreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen()
        setIsFullScreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullScreen(false)
      }
    } catch {
      // Fullscreen not supported — silently ignore
    }
  }, [])

  // Sync fullscreen state if user exits via Esc key
  useEffect(() => {
    const handler = () => setIsFullScreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  return (
    <div
      ref={containerRef}
      className={`z-50 rounded-2xl overflow-hidden shadow-2xl bg-gray-900 text-white ${
        isFullScreen
          ? 'fixed inset-0 rounded-none flex flex-col'
          : 'fixed bottom-6 right-6'
      }`}
      style={isFullScreen ? undefined : { width: callType === 'VIDEO' ? 340 : 280, minHeight: callType === 'VIDEO' ? 260 : 160 }}
      data-testid="active-call-view"
      role="dialog"
      aria-label={`Active ${callType.toLowerCase()} call with ${otherUsername}`}
    >
      {callType === 'VIDEO' ? (
        /* Video layout */
        <div className={`relative w-full bg-gray-800 ${isFullScreen ? 'flex-1 h-0' : 'h-48'}`}>
          {/* Remote video fills the box */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            data-testid="remote-video"
            aria-label={`${otherUsername}'s video`}
          />
          {/* Fallback avatar while remote video hasn't started flowing yet */}
          {!remoteHasVideo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Avatar name={otherUsername} size="xl" src={otherAvatarUrl} />
            </div>
          )}
          {/* Local video — small PiP */}
          <div className="absolute bottom-2 right-2 w-20 h-16 rounded-lg overflow-hidden border-2 border-white/30 bg-black">
            {!cameraOff ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                data-testid="local-video"
                aria-label="Your video"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-700">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} />
                </svg>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Audio-only layout */
        <div className="flex flex-col items-center pt-5 pb-2 bg-gray-800">
          <Avatar name={otherUsername} size="lg" src={otherAvatarUrl} />
          <p className="mt-2 text-sm font-medium">{otherUsername}</p>
        </div>
      )}

      {/* Info bar */}
      <div className="px-3 py-1.5 flex items-center justify-between bg-gray-900/80 backdrop-blur-sm">
        <span className="text-xs text-gray-300 font-mono" data-testid="call-timer">
          {formatTime(elapsedSeconds)}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 uppercase tracking-wide">
            {callType === 'VIDEO' ? 'Video' : 'Audio'} call
          </span>
          {callType === 'VIDEO' && (
            <button
              onClick={toggleFullScreen}
              className="p-1 text-gray-400 hover:text-white transition-colors rounded"
              aria-label={isFullScreen ? 'Exit full screen' : 'Enter full screen'}
              data-testid="fullscreen-btn"
            >
              {isFullScreen ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0l5 0M4 4v5m15-5l-5 5m5-5h-5m0 0V4M9 15l-5 5m0 0l5 0m-5 0v-5m15 5l-5-5m5 5h-5m0 0v5" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Hidden audio element — plays remote audio in audio-only calls */}
      {callType === 'AUDIO' && (
        <audio ref={remoteAudioRef} autoPlay data-testid="remote-audio" />
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 py-3 bg-gray-900">
        {/* Mute mic */}
        <button
          onClick={toggleMic}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
            micMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          aria-label={micMuted ? 'Unmute microphone' : 'Mute microphone'}
          data-testid="mute-btn"
        >
          {micMuted ? (
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>

        {/* Toggle camera (video only) */}
        {callType === 'VIDEO' && (
          <button
            onClick={toggleCamera}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
              cameraOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
            aria-label={cameraOff ? 'Turn on camera' : 'Turn off camera'}
            data-testid="camera-btn"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              {cameraOff && <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} />}
            </svg>
          </button>
        )}

        {/* Hang up */}
        <button
          onClick={onHangUp}
          className="w-11 h-11 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
          aria-label="Hang up"
          data-testid="hangup-btn"
        >
          <svg className="w-5 h-5 text-white rotate-135" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
