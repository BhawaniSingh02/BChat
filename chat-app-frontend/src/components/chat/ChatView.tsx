import { useEffect, useMemo, useState } from 'react'
import type { Message, Room } from '../../types'
import { useChatStore } from '../../store/chatStore'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import MembersPanel from './MembersPanel'
import MessageSearch from './MessageSearch'

interface ChatViewProps {
  room: Room
  currentUsername: string
  onSendMessage: (content: string, fileUrl?: string, messageType?: string) => void
  onTyping: (typing: boolean) => void
  onSubscribe: () => void
  onLeave?: () => void
  onEditMessage?: (messageId: string, newContent: string) => void
  onDeleteMessage?: (messageId: string) => void
  onReactMessage?: (messageId: string, emoji: string) => void
  onViewProfile?: (username: string) => void
  onBack?: () => void
  onKickMember?: (username: string) => void
  onOpenSettings?: () => void
  onPinMessage?: (messageId: string) => void
  onUnpinMessage?: (messageId: string) => void
}

export default function ChatView({
  room,
  currentUsername,
  onSendMessage,
  onTyping,
  onSubscribe,
  onLeave,
  onEditMessage,
  onDeleteMessage,
  onReactMessage,
  onViewProfile,
  onBack,
  onKickMember,
  onOpenSettings,
  onPinMessage,
  onUnpinMessage,
}: ChatViewProps) {
  const [showMembers, setShowMembers] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const isAdmin = room.createdBy === currentUsername

  const rawMessages = useChatStore((s) => s.messages[room.roomId])
  const messages = useMemo(() => rawMessages ?? [], [rawMessages])
  const isLoading = useChatStore((s) => s.isLoadingMessages)
  const roomTypingUsers = useChatStore((s) => s.typingUsers[room.roomId])
  const typingUsers = useMemo(
    () => (roomTypingUsers ?? []).filter((u) => u !== currentUsername),
    [roomTypingUsers, currentUsername]
  )
  const fetchMessages = useChatStore((s) => s.fetchMessages)

  useEffect(() => {
    fetchMessages(room.roomId)
    onSubscribe()
  }, [room.roomId])

  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="px-4 py-2.5 bg-[#075e54] flex items-center justify-between shadow-md z-10">
          <div className="flex items-center gap-3 min-w-0">
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
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-base">#</span>
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-white truncate text-[15px]">{room.name}</h2>
              {room.description ? (
                <p className="text-xs text-white/60 truncate">{room.description}</p>
              ) : (
                <p className="text-xs text-white/50">{room.memberCount} {room.memberCount === 1 ? 'member' : 'members'}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded-full transition-colors ${
                showSearch ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              aria-label="Search messages"
              data-testid="search-toggle-btn"
              title="Search messages"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button
              onClick={() => setShowMembers(!showMembers)}
              className={`p-2 rounded-full transition-colors ${
                showMembers ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              aria-label="Toggle members panel"
              data-testid="members-toggle-btn"
              title="Members"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            {isAdmin && onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Room settings"
                data-testid="room-settings-btn"
                aria-label="Room settings"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
            {onLeave && (
              <button
                onClick={onLeave}
                className="p-2 text-white/70 hover:text-red-300 hover:bg-white/10 rounded-full transition-colors"
                title="Leave room"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Pinned messages bar */}
        {(room.pinnedMessages ?? []).length > 0 && (
          <PinnedBar
            pinnedMessageIds={room.pinnedMessages!}
            messages={messages}
            onUnpin={onUnpinMessage}
            canUnpin={isAdmin}
          />
        )}

        {/* In-room message search */}
        {showSearch && (
          <MessageSearch
            messages={messages}
            onClose={() => setShowSearch(false)}
            onScrollTo={(messageId) => {
              const el = document.getElementById(`msg-${messageId}`)
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
          />
        )}

        {/* Messages */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Loading messages…
          </div>
        ) : (
          <MessageList
            messages={messages}
            currentUsername={currentUsername}
            typingUsers={typingUsers}
            isAdmin={isAdmin}
            pinnedMessageIds={room.pinnedMessages}
            onEditMessage={onEditMessage}
            onDeleteMessage={onDeleteMessage}
            onReactMessage={onReactMessage}
            onViewProfile={onViewProfile}
            onPinMessage={onPinMessage}
            onUnpinMessage={onUnpinMessage}
          />
        )}

        {/* Input */}
        <MessageInput
          onSend={onSendMessage}
          onTyping={onTyping}
          placeholder={`Message #${room.name}`}
        />
      </div>

      {showMembers && (
        <MembersPanel
          roomId={room.roomId}
          roomAdmin={room.createdBy}
          currentUsername={currentUsername}
          onClose={() => setShowMembers(false)}
          onViewProfile={onViewProfile}
          onKickMember={onKickMember}
        />
      )}
    </div>
  )
}

function PinnedBar({ pinnedMessageIds, messages, onUnpin, canUnpin }: {
  pinnedMessageIds: string[]
  messages: Message[]
  onUnpin?: (messageId: string) => void
  canUnpin?: boolean
}) {
  const pinned = pinnedMessageIds
    .map((id) => messages.find((m) => m.id === id))
    .filter(Boolean) as Message[]

  if (pinned.length === 0) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5" data-testid="pinned-bar">
      <div className="flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V4z" clipRule="evenodd" />
        </svg>
        <div className="flex-1 min-w-0 flex gap-3 overflow-x-auto">
          {pinned.map((msg) => (
            <button
              key={msg.id}
              onClick={() => {
                const el = document.getElementById(`msg-${msg.id}`)
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }}
              className="flex-shrink-0 text-xs text-amber-800 hover:text-amber-900 truncate max-w-[200px]"
              data-testid={`pinned-msg-${msg.id}`}
            >
              <span className="font-medium">{msg.senderName}: </span>
              {msg.deleted ? '[deleted]' : msg.content}
            </button>
          ))}
        </div>
        {canUnpin && pinned.length > 0 && onUnpin && (
          <button
            onClick={() => onUnpin(pinned[pinned.length - 1].id)}
            className="text-xs text-amber-500 hover:text-amber-700 flex-shrink-0"
            title="Unpin last"
            data-testid="unpin-btn"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
