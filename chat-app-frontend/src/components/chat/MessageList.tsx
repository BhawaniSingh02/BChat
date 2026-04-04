import { useEffect, useRef } from 'react'
import type { Message } from '../../types'
import MessageBubble, { type DropdownAction } from './MessageBubble'
import { formatDate, isSameDay } from '../../utils/date'
import { useUserCacheStore } from '../../store/userCacheStore'

interface MessageListProps {
  messages: Message[]
  currentUsername: string
  typingUsers: string[]
  onViewProfile?: (username: string) => void
  onReactMessage?: (messageId: string, emoji: string) => void
  // Selection (WhatsApp-style)
  selectionMode?: boolean
  selectedIds?: Set<string>
  onSelectMessage?: (messageId: string) => void
  onEnterSelectionMode?: (message: Message) => void
  // Inline edit trigger from action bar
  editingMessageId?: string | null
  onEditMessage?: (messageId: string, newContent: string) => void
  // Desktop dropdown
  onDropdownAction?: (action: DropdownAction, message: Message) => void
  isAdmin?: boolean
  pinnedMessageIds?: string[]
}

function DateDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center my-6" role="separator">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="mx-3 text-xs font-medium text-gray-400 bg-white border border-gray-200 rounded-full px-3 py-1">
        {formatDate(date)}
      </span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}

function TypingIndicator({ users }: { users: string[] }) {
  if (users.length === 0) return null
  const text = users.length === 1
    ? `${users[0]} is typing`
    : `${users.slice(0, 2).join(', ')} are typing`
  return (
    <div className="flex items-end gap-2 mb-3 ml-1" aria-live="polite" aria-label={text + '…'}>
      <div className="w-8 h-8 flex-shrink-0" />
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-xs text-gray-400 mt-1">{text}…</p>
      </div>
    </div>
  )
}

function withinGroup(a: string, b: string): boolean {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 5 * 60 * 1000
}

export default function MessageList({
  messages, currentUsername, typingUsers,
  onViewProfile, onReactMessage,
  selectionMode, selectedIds, onSelectMessage, onEnterSelectionMode,
  editingMessageId, onEditMessage,
  onDropdownAction, isAdmin, pinnedMessageIds,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const prefetch = useUserCacheStore((s) => s.prefetch)

  useEffect(() => {
    const senders = messages
      .filter((m) => m.sender !== currentUsername)
      .map((m) => m.sender)
    prefetch(senders)
  }, [messages, currentUsername, prefetch])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, typingUsers.length])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 chat-bg">
        <div className="bg-white/80 backdrop-blur rounded-2xl px-8 py-6 shadow-sm border border-white/60">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-3 text-3xl mx-auto">
            💬
          </div>
          <p className="text-gray-600 font-medium mb-1">No messages yet</p>
          <p className="text-gray-400 text-sm">Be the first to say something!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0 chat-bg" data-testid="message-list">
      {messages.map((message, index) => {
        const prevMessage = messages[index - 1]
        const nextMessage = messages[index + 1]
        const showDateDivider = !prevMessage || !isSameDay(prevMessage.timestamp, message.timestamp)

        const isGrouped = !!prevMessage
          && prevMessage.sender === message.sender
          && withinGroup(prevMessage.timestamp, message.timestamp)
          && !showDateDivider

        const isLastInGroup = !nextMessage
          || nextMessage.sender !== message.sender
          || !withinGroup(message.timestamp, nextMessage.timestamp)

        const isMine = message.sender === currentUsername

        return (
          <div key={message.id}>
            {showDateDivider && <DateDivider date={message.timestamp} />}

            <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}>
              <div className="flex flex-col flex-1 min-w-0">
                <MessageBubble
                  message={message}
                  isMine={isMine}
                  isGrouped={isGrouped}
                  currentUsername={currentUsername}
                  onReact={onReactMessage}
                  onEdit={onEditMessage}
                  onScrollToMessage={(id) => {
                    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }}
                  isSelected={selectedIds?.has(message.id) ?? false}
                  selectionMode={selectionMode ?? false}
                  onSelect={onSelectMessage}
                  onEnterSelectionMode={onEnterSelectionMode}
                  isEditing={editingMessageId === message.id}
                  onDropdownAction={onDropdownAction}
                  isAdmin={isAdmin}
                  isPinned={pinnedMessageIds?.includes(message.id) ?? false}
                />
              </div>
            </div>
          </div>
        )
      })}
      <TypingIndicator users={typingUsers} />
      <div ref={bottomRef} />
    </div>
  )
}
