import { useState, useEffect } from 'react'
import type { User } from '../../types'
import { roomsApi } from '../../api/rooms'
import { usePresenceStore } from '../../store/presenceStore'
import Avatar from '../ui/Avatar'

interface MembersPanelProps {
  roomId: string
  roomAdmin?: string
  currentUsername?: string
  onClose: () => void
  onViewProfile?: (username: string) => void
  onKickMember?: (username: string) => void
}

export default function MembersPanel({ roomId, roomAdmin, currentUsername, onClose, onViewProfile, onKickMember }: MembersPanelProps) {
  const [members, setMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const isOnline = usePresenceStore((s) => s.isOnline)

  useEffect(() => {
    setLoading(true)
    roomsApi.getMembers(roomId)
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }, [roomId])

  const online = members.filter((m) => isOnline(m.username))
  const offline = members.filter((m) => !isOnline(m.username))

  return (
    <div
      className="w-64 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col h-full"
      data-testid="members-panel"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm">Members</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition-colors"
          aria-label="Close members panel"
          data-testid="close-members-btn"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">Loading members…</div>
        ) : (
          <>
            {online.length > 0 && (
              <div>
                <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Online — {online.length}
                </p>
                {online.map((member) => (
                  <MemberRow key={member.username} member={member} online onViewProfile={onViewProfile} isAdmin={member.username === roomAdmin} canKick={currentUsername === roomAdmin && member.username !== currentUsername} onKick={onKickMember} />
                ))}
              </div>
            )}
            {offline.length > 0 && (
              <div className="mt-2">
                <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Offline — {offline.length}
                </p>
                {offline.map((member) => (
                  <MemberRow key={member.username} member={member} online={false} onViewProfile={onViewProfile} isAdmin={member.username === roomAdmin} canKick={currentUsername === roomAdmin && member.username !== currentUsername} onKick={onKickMember} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function MemberRow({ member, online, onViewProfile, isAdmin, canKick, onKick }: {
  member: User
  online: boolean
  onViewProfile?: (username: string) => void
  isAdmin?: boolean
  canKick?: boolean
  onKick?: (username: string) => void
}) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 hover:bg-gray-50 transition-colors group" data-testid="member-row">
      <button
        onClick={() => onViewProfile?.(member.username)}
        className="flex items-center gap-3 flex-1 min-w-0 text-left focus:outline-none"
      >
        <div className="relative flex-shrink-0">
          <Avatar name={member.username} size="sm" online={online} />
          {isAdmin && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 rounded-full flex items-center justify-center"
              title="Room admin"
              data-testid="admin-badge"
            >
              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {member.displayName || member.username}
            {isAdmin && <span className="ml-1 text-[10px] text-amber-500 font-semibold">Admin</span>}
          </p>
          {member.displayName && (
            <p className="text-xs text-gray-400 truncate">@{member.username}</p>
          )}
        </div>
      </button>
      {canKick && (
        <button
          onClick={() => onKick?.(member.username)}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
          aria-label={`Kick ${member.username}`}
          data-testid="kick-member-btn"
          title={`Remove ${member.username}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
          </svg>
        </button>
      )}
    </div>
  )
}
