import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Avatar from '../ui/Avatar'
import { useDMStore } from '../../store/dmStore'
import { useUserCacheStore } from '../../store/userCacheStore'
import { dmApi } from '../../api/dm'
import type { DirectConversation } from '../../types'

interface MessageRequestsModalProps {
  open: boolean
  onClose: () => void
  currentUsername: string
  onOpenConversation: (conversationId: string) => void
}

/**
 * Instagram-style "Message requests" inbox — first messages from people you
 * haven't accepted. Accept promotes it to a normal chat; Decline removes it.
 */
export default function MessageRequestsModal({
  open, onClose, currentUsername, onOpenConversation,
}: MessageRequestsModalProps) {
  const requests = useDMStore((s) => s.requests)
  const acceptRequest = useDMStore((s) => s.acceptRequest)
  const declineRequest = useDMStore((s) => s.declineRequest)
  const fetchRequests = useDMStore((s) => s.fetchRequests)
  const cache = useUserCacheStore((s) => s.cache)
  const prefetch = useUserCacheStore((s) => s.prefetch)

  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const requesterOf = (r: DirectConversation) =>
    r.initiatedBy || r.participants.find((p) => p !== currentUsername) || ''

  useEffect(() => {
    if (open) fetchRequests()
  }, [open, fetchRequests])

  useEffect(() => {
    if (!open || requests.length === 0) return
    prefetch(requests.map(requesterOf).filter(Boolean))
    // Best-effort one-line preview of each request's first message.
    requests.forEach(async (r) => {
      try {
        const page = await dmApi.getMessages(r.id, 0, 1)
        const last = page.content?.[0]
        if (last) setPreviews((p) => ({ ...p, [r.id]: last.content || '📎 Attachment' }))
      } catch { /* ignore */ }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, requests])

  const handleAccept = async (id: string) => {
    setBusyId(id)
    try {
      await acceptRequest(id)
      onOpenConversation(id)
      onClose()
    } catch { /* ignore */ } finally { setBusyId(null) }
  }

  const handleDecline = async (id: string) => {
    setBusyId(id)
    try { await declineRequest(id) } catch { /* ignore */ } finally { setBusyId(null) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Message requests">
      <div data-testid="message-requests-modal">
        <p className="text-xs text-gray-500 mb-3">
          First messages from people you haven't chatted with. Accepting lets them message you.
        </p>

        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl mb-3">📨</div>
            <p className="text-sm font-medium text-gray-700">No message requests</p>
            <p className="text-xs text-gray-400 mt-1">Requests from people you don't follow show up here.</p>
          </div>
        ) : (
          <div className="-mx-2 max-h-96 overflow-y-auto divide-y divide-gray-50">
            {requests.map((r) => {
              const username = requesterOf(r)
              const u = cache[username]
              const name = u?.displayName || (u?.uniqueHandle ? `@${u.uniqueHandle}` : username)
              const handle = u?.uniqueHandle ? `@${u.uniqueHandle}` : ''
              return (
                <div key={r.id} className="flex items-start gap-3 px-2 py-3" data-testid="message-request-item">
                  <Avatar name={u?.displayName || u?.uniqueHandle || username} size="md" src={u?.avatarUrl} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{name}</p>
                    {handle && u?.displayName && <p className="text-xs text-gray-400 truncate">{handle}</p>}
                    <p className="text-sm text-gray-500 truncate mt-0.5">
                      {previews[r.id] ?? 'wants to send you a message'}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleAccept(r.id)}
                        disabled={busyId === r.id}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
                        data-testid="accept-request-btn"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDecline(r.id)}
                        disabled={busyId === r.id}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition disabled:opacity-50"
                        data-testid="decline-request-btn"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}
