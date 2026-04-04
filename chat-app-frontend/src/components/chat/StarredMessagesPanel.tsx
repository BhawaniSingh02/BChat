import { useEffect, useState } from 'react'
import type { Message } from '../../types'
import { messagesApi } from '../../api/messages'
import { formatTime } from '../../utils/date'

interface StarredMessagesPanelProps {
  onClose: () => void
  currentUsername: string
}

export default function StarredMessagesPanel({ onClose, currentUsername }: StarredMessagesPanelProps) {
  const [starred, setStarred] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    messagesApi.getStarred()
      .then((msgs) => {
        setStarred(msgs)
        setError(null)
      })
      .catch(() => setError('Failed to load starred messages'))
      .finally(() => setLoading(false))
  }, [])

  const handleUnstar = async (messageId: string) => {
    try {
      await messagesApi.toggleStar(messageId)
      setStarred((prev) => prev.filter((m) => m.id !== messageId))
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-col h-full bg-white" data-testid="starred-messages-panel">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#075e54] text-white flex-shrink-0">
        <button onClick={onClose} className="hover:opacity-80 transition-opacity" aria-label="Close starred messages">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-300 fill-yellow-300" viewBox="0 0 24 24">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <span className="font-semibold">Starred Messages</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && (
          <div className="flex justify-center items-center h-32">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <p className="text-center text-sm text-red-500 mt-8" data-testid="starred-error">{error}</p>
        )}

        {!loading && !error && starred.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <svg className="w-12 h-12 mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <p className="text-sm">No starred messages yet</p>
            <p className="text-xs mt-1 text-center max-w-[200px]">Star important messages to find them quickly here</p>
          </div>
        )}

        {!loading && starred.map((msg) => (
          <div
            key={msg.id}
            className="bg-gray-50 rounded-xl p-3 border border-gray-100"
            data-testid="starred-message-item"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-emerald-700">{msg.senderName}</span>
                  <span className="text-[10px] text-gray-400">{formatTime(msg.timestamp)}</span>
                  {/* Show room/DM context */}
                  <span className="text-[10px] text-gray-400 truncate">
                    {msg.roomId.startsWith('dm:') ? 'DM' : `#${msg.roomId}`}
                  </span>
                </div>
                {msg.messageType === 'IMAGE' && msg.fileUrl ? (
                  <p className="text-xs text-gray-500 italic">📷 Photo</p>
                ) : msg.messageType === 'FILE' && msg.fileUrl ? (
                  <p className="text-xs text-gray-500 italic">📎 File</p>
                ) : msg.messageType === 'VIDEO' && msg.fileUrl ? (
                  <p className="text-xs text-gray-500 italic">🎥 Video</p>
                ) : (
                  <p className="text-sm text-gray-800 line-clamp-3">{msg.content}</p>
                )}
              </div>
              <button
                onClick={() => handleUnstar(msg.id)}
                className="flex-shrink-0 text-yellow-400 hover:text-gray-400 transition-colors"
                aria-label="Unstar message"
                data-testid="unstar-btn"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
