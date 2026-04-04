import type { CallType } from '../../types'
import Avatar from '../ui/Avatar'

interface OutgoingCallViewProps {
  calleeUsername: string
  callType: CallType
  calleeAvatarUrl?: string
  onCancel: () => void
}

/**
 * Shown to the caller while waiting for the callee to pick up.
 * Distinct from ActiveCallView — no video grid, just a "Calling…" screen.
 */
export default function OutgoingCallView({
  calleeUsername,
  callType,
  calleeAvatarUrl,
  onCancel,
}: OutgoingCallViewProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/95 text-white"
      data-testid="outgoing-call-view"
      role="dialog"
      aria-modal="true"
      aria-label={`Calling ${calleeUsername}…`}
    >
      {/* Animated pulsing ring */}
      <div className="relative mb-6">
        <span className="absolute inset-0 rounded-full animate-ping bg-blue-400 opacity-20 scale-[2]" />
        <span className="absolute inset-0 rounded-full animate-ping bg-blue-400 opacity-10 scale-[3]" style={{ animationDelay: '0.3s' }} />
        <Avatar name={calleeUsername} size="xl" src={calleeAvatarUrl} />
      </div>

      {/* Call-type label */}
      <p className="text-sm text-gray-300 uppercase tracking-widest mb-1">
        {callType === 'VIDEO' ? 'Video' : 'Audio'} call
      </p>

      {/* Callee name */}
      <h2 className="text-2xl font-semibold mb-3" data-testid="outgoing-callee-name">
        {calleeUsername}
      </h2>

      {/* Animated "Calling…" dots */}
      <p className="text-gray-400 text-sm mb-12" data-testid="calling-label">
        Calling
        <span className="inline-flex gap-0.5 ml-1">
          <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '200ms' }} />
          <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '400ms' }} />
        </span>
      </p>

      {/* Cancel button */}
      <button
        onClick={onCancel}
        className="flex flex-col items-center gap-2 group"
        aria-label="Cancel call"
        data-testid="cancel-outgoing-call-btn"
      >
        <span className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg group-hover:bg-red-600 transition-colors">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </span>
        <span className="text-sm text-gray-300">Cancel</span>
      </button>
    </div>
  )
}
