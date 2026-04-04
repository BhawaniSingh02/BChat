import type { CallSession } from '../../types'

interface CallHistoryPanelProps {
  sessions: CallSession[]
  currentUsername: string
  onClose: () => void
}

function formatDuration(secs: number): string {
  if (secs === 0) return ''
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function CallStatusIcon({ status }: { status: CallSession['status'] }) {
  switch (status) {
    case 'ENDED':
      return (
        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      )
    case 'MISSED':
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      )
    case 'REJECTED':
      return (
        <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      )
    default:
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
  }
}

export default function CallHistoryPanel({ sessions, currentUsername, onClose }: CallHistoryPanelProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50" data-testid="call-history-panel">
      <div className="bg-white rounded-xl shadow-2xl w-80 max-h-[70vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Call History</h2>
          <button onClick={onClose} aria-label="Close call history" data-testid="close-history-btn"
            className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {sessions.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No call history yet</p>
          ) : (
            sessions.map((session) => {
              const isOutgoing = session.callerId === currentUsername
              const date = new Date(session.startedAt)
              const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

              return (
                <div
                  key={session.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50"
                  data-testid={`call-history-item-${session.id}`}
                >
                  <CallStatusIcon status={session.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {session.callType === 'VIDEO' ? (
                        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      )}
                      <span className="text-sm font-medium text-gray-800 capitalize">
                        {isOutgoing ? 'Outgoing' : 'Incoming'} {session.callType.toLowerCase()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {dateStr} at {timeStr}
                      {session.durationSeconds > 0 && (
                        <> · {formatDuration(session.durationSeconds)}</>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-medium capitalize ${
                    session.status === 'ENDED' ? 'text-emerald-600' :
                    session.status === 'MISSED' ? 'text-red-500' :
                    session.status === 'REJECTED' ? 'text-orange-500' : 'text-gray-400'
                  }`}>
                    {session.status.toLowerCase()}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
