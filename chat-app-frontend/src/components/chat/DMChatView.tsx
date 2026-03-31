import { useEffect, useMemo } from 'react'
import type { DirectConversation, MessageType } from '../../types'
import { useDMStore } from '../../store/dmStore'
import { usePresenceStore } from '../../store/presenceStore'
import { useUserCacheStore } from '../../store/userCacheStore'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import Avatar from '../ui/Avatar'

interface DMChatViewProps {
  conversation: DirectConversation
  currentUsername: string
  onSend: (content: string, fileUrl?: string, messageType?: MessageType) => void
  onViewProfile?: (username: string) => void
  onEditMessage?: (messageId: string, newContent: string) => void
  onDeleteMessage?: (messageId: string) => void
  onReactMessage?: (messageId: string, emoji: string) => void
  onBack?: () => void
}

export default function DMChatView({ conversation, currentUsername, onSend, onViewProfile, onEditMessage, onDeleteMessage, onReactMessage, onBack }: DMChatViewProps) {
  const rawMessages = useDMStore((s) => s.messages[conversation.id])
  const messages = useMemo(() => rawMessages ?? [], [rawMessages])
  const isLoading = useDMStore((s) => s.isLoading)
  const fetchMessages = useDMStore((s) => s.fetchMessages)
  const isOnline = usePresenceStore((s) => s.isOnline)

  const otherUser = conversation.participants.find((p) => p !== currentUsername) ?? '?'
  const online = isOnline(otherUser)
  const fetchUser = useUserCacheStore((s) => s.fetchUser)
  const cache = useUserCacheStore((s) => s.cache)

  useEffect(() => {
    fetchMessages(conversation.id)
    fetchUser(otherUser)
  }, [conversation.id, otherUser])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2.5 bg-[#075e54] flex items-center gap-3 shadow-md z-10">
        {/* Back button — mobile only */}
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Back to sidebar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <button
          onClick={() => onViewProfile?.(otherUser)}
          className="focus:outline-none flex-shrink-0"
          aria-label={`View ${otherUser}'s profile`}
        >
          <Avatar name={otherUser} size="md" online={online} src={cache[otherUser]?.avatarUrl} />
        </button>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => onViewProfile?.(otherUser)}
            className="font-semibold text-white truncate block text-left hover:underline focus:outline-none"
          >
            {otherUser}
          </button>
          <p className="text-xs text-white/60">{online ? 'online' : 'offline'}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Loading messages…
        </div>
      ) : (
        <MessageList
          messages={messages}
          currentUsername={currentUsername}
          typingUsers={[]}
          onViewProfile={onViewProfile}
          onEditMessage={onEditMessage}
          onDeleteMessage={onDeleteMessage}
          onReactMessage={onReactMessage}
        />
      )}

      <MessageInput onSend={onSend} placeholder={`Message ${otherUser}`} />
    </div>
  )
}
