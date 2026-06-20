import { useEffect, useMemo } from 'react'
import type { CallSession, CallType } from '../../types'
import { useCallStore } from '../../store/callStore'
import { useUserCacheStore } from '../../store/userCacheStore'
import Avatar from '../ui/Avatar'
import { formatRelative } from '../../utils/date'

interface CallLogListProps {
  currentUsername: string
  onStartCall: (conversationId: string, otherUsername: string, type: CallType) => void
  onOpenConversation: (conversationId: string) => void
}

interface CallRow {
  session: CallSession
  other: string
  outgoing: boolean
  missed: boolean
  label: string
}

function CallLogSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-gray-200" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-28 animate-pulse rounded bg-gray-200" />
        <div className="h-2.5 w-20 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
  )
}

/** Arrow showing call direction; red for missed incoming calls. */
function DirectionIcon({ outgoing, missed }: { outgoing: boolean; missed: boolean }) {
  const color = missed ? 'text-red-500' : outgoing ? 'text-emerald-500' : 'text-teal-500'
  // Outgoing → arrow up-right; incoming/missed → arrow down-left
  const d = outgoing ? 'M7 17L17 7M17 7H9M17 7v8' : 'M17 7L7 17M7 17h8M7 17V9'
  return (
    <svg className={`h-4 w-4 flex-shrink-0 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

export default function CallLogList({ currentUsername, onStartCall, onOpenConversation }: CallLogListProps) {
  const myCallHistory = useCallStore((s) => s.myCallHistory)
  const loaded = useCallStore((s) => s.myCallHistoryLoaded)
  const fetchMyCallHistory = useCallStore((s) => s.fetchMyCallHistory)
  const cache = useUserCacheStore((s) => s.cache)
  const prefetch = useUserCacheStore((s) => s.prefetch)

  useEffect(() => {
    void fetchMyCallHistory()
  }, [fetchMyCallHistory])

  const rows: CallRow[] = useMemo(
    () =>
      myCallHistory.map((session) => {
        const outgoing = session.callerId === currentUsername
        const other = outgoing ? session.calleeId : session.callerId
        const missed = !outgoing && session.status === 'MISSED'
        const label = missed
          ? 'Missed'
          : outgoing
            ? 'Outgoing'
            : session.status === 'REJECTED'
              ? 'Declined'
              : 'Incoming'
        return { session, other, outgoing, missed, label }
      }),
    [myCallHistory, currentUsername],
  )

  // Resolve the other participants' profiles for names/avatars.
  useEffect(() => {
    const others = rows.map((r) => r.other).filter(Boolean)
    if (others.length) prefetch(others)
  }, [rows, prefetch])

  if (!loaded) {
    return (
      <div className="py-2" data-testid="call-log-loading">
        {Array.from({ length: 6 }).map((_, i) => <CallLogSkeleton key={i} />)}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center" data-testid="call-log-empty">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-2xl">📞</div>
        <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">No calls yet</p>
        <p className="text-xs text-gray-400">Your audio and video calls will show up here.</p>
      </div>
    )
  }

  return (
    <div data-testid="call-log-list">
      {rows.map(({ session, other, outgoing, missed, label }) => {
        const u = cache[other]
        const name = u?.displayName || (u?.uniqueHandle ? `@${u.uniqueHandle}` : '…')
        return (
          <div
            key={session.id}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
            data-testid="call-log-item"
          >
            <button
              onClick={() => onOpenConversation(session.conversationId)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <Avatar name={name} size="md" src={u?.avatarUrl ?? undefined} />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-medium ${missed ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>{name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                  <DirectionIcon outgoing={outgoing} missed={missed} />
                  <span className={missed ? 'text-red-500' : ''}>{label}</span>
                  <span>· {formatRelative(session.startedAt)}</span>
                </p>
              </div>
            </button>

            <button
              onClick={() => onStartCall(session.conversationId, other, session.callType)}
              className="flex-shrink-0 rounded-full p-2 text-teal-600 transition-colors hover:bg-teal-50"
              aria-label={session.callType === 'VIDEO' ? `Video call ${name}` : `Call ${name}`}
              data-testid="call-log-callback"
            >
              {session.callType === 'VIDEO' ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}
