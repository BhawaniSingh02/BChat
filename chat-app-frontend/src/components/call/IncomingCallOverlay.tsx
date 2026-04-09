import { useEffect, useRef, useState } from 'react'
import type { CallType } from '../../types'
import Avatar from '../ui/Avatar'

interface IncomingCallOverlayProps {
  callerUsername: string
  callType: CallType
  callerAvatarUrl?: string
  onAccept: () => void
  onDecline: () => void
  /** Seconds before auto-declining. Default: 60. */
  timeoutSeconds?: number
}

/**
 * Full-screen overlay shown to the callee when an incoming call arrives.
 * Automatically declines after `timeoutSeconds` if not answered.
 */
export default function IncomingCallOverlay({
  callerUsername,
  callType,
  callerAvatarUrl,
  onAccept,
  onDecline,
  timeoutSeconds = 60,
}: IncomingCallOverlayProps) {
  const [countdown, setCountdown] = useState(timeoutSeconds)
  const onDeclineRef = useRef(onDecline)
  onDeclineRef.current = onDecline

  // Auto-decline when countdown reaches zero
  useEffect(() => {
    if (timeoutSeconds <= 0) return
    const id = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(id)
          onDeclineRef.current()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [timeoutSeconds])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/95 text-white"
      data-testid="incoming-call-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Incoming ${callType.toLowerCase()} call from ${callerUsername}`}
    >
      {/* Pulsing ring animation */}
      <div className="relative mb-6">
        <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-30 scale-150" />
        <Avatar name={callerUsername} size="xl" src={callerAvatarUrl} />
      </div>

      <p className="text-sm text-gray-300 uppercase tracking-widest mb-1">
        Incoming {callType.toLowerCase()} call
      </p>
      <h2 className="text-2xl font-semibold mb-2">{callerUsername}</h2>

      {/* Countdown indicator */}
      <p className="text-xs text-gray-500 mb-10" data-testid="ring-countdown">
        Auto-declining in {countdown}s
      </p>

      <div className="flex items-center gap-16">
        {/* Decline */}
        <button
          onClick={onDecline}
          className="flex flex-col items-center gap-2 group"
          aria-label="Decline call"
          data-testid="decline-call-btn"
        >
          <span className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg group-hover:bg-red-600 transition-colors">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </span>
          <span className="text-sm text-gray-300">Decline</span>
        </button>

        {/* Accept */}
        <button
          onClick={onAccept}
          className="flex flex-col items-center gap-2 group"
          aria-label="Accept call"
          data-testid="accept-call-btn"
        >
          <span className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg group-hover:bg-emerald-600 transition-colors">
            {callType === 'VIDEO' ? (
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            )}
          </span>
          <span className="text-sm text-gray-300">Accept</span>
        </button>
      </div>
    </div>
  )
}
