import { useState } from 'react'
import type { Message } from '../../types'
import { useDMStore } from '../../store/dmStore'
import { useRoomStore } from '../../store/roomStore'
import { useAuthStore } from '../../store/authStore'
import { messagesApi } from '../../api/messages'

interface ForwardMessageModalProps {
  message: Message
  onClose: () => void
}

export default function ForwardMessageModal({ message, onClose }: ForwardMessageModalProps) {
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const { conversations } = useDMStore()
  const { myRooms } = useRoomStore()
  const { user } = useAuthStore()

  const filteredRooms = myRooms.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase())
  )
  const filteredDMs = conversations.filter((c) => {
    const other = c.participants.find((p) => p !== user?.username)
    return other?.toLowerCase().includes(query.toLowerCase())
  })

  const forwardToRoom = async (roomId: string, roomName: string) => {
    setSending(true)
    setError(null)
    try {
      await messagesApi.forward(message.id, { roomId })
      setSuccess(`Forwarded to #${roomName}`)
      setTimeout(onClose, 1500)
    } catch {
      setError('Failed to forward message')
    } finally {
      setSending(false)
    }
  }

  const forwardToDM = async (conversationId: string, otherUsername: string) => {
    setSending(true)
    setError(null)
    try {
      await messagesApi.forward(message.id, { conversationId })
      setSuccess(`Forwarded to ${otherUsername}`)
      setTimeout(onClose, 1500)
    } catch {
      setError('Failed to forward message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
      data-testid="forward-modal"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-semibold text-gray-900">Forward Message</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message preview */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex-shrink-0">
          <p className="text-xs text-gray-500 truncate">{message.content || '📎 Attachment'}</p>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-gray-100 flex-shrink-0">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rooms and chats…"
            className="w-full text-sm bg-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            data-testid="forward-search"
          />
        </div>

        {/* Status messages */}
        {success && (
          <p className="text-center text-sm text-emerald-600 py-2 font-medium" data-testid="forward-success">{success}</p>
        )}
        {error && (
          <p className="text-center text-sm text-red-500 py-1" data-testid="forward-error">{error}</p>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
          {filteredRooms.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-1">Rooms</p>
              {filteredRooms.map((room) => (
                <button
                  key={room.roomId}
                  onClick={() => forwardToRoom(room.roomId, room.name)}
                  disabled={sending}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
                  data-testid={`forward-room-${room.roomId}`}
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-emerald-700">{room.name[0].toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{room.name}</span>
                </button>
              ))}
            </div>
          )}

          {filteredDMs.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-1 mt-1">Direct Messages</p>
              {filteredDMs.map((conv) => {
                const other = conv.participants.find((p) => p !== user?.username) ?? '?'
                return (
                  <button
                    key={conv.id}
                    onClick={() => forwardToDM(conv.id, other)}
                    disabled={sending}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
                    data-testid={`forward-dm-${conv.id}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-blue-700">{other[0]?.toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{other}</span>
                  </button>
                )
              })}
            </div>
          )}

          {filteredRooms.length === 0 && filteredDMs.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">No results</p>
          )}
        </div>
      </div>
    </div>
  )
}
