import { useEffect, useRef } from 'react'
import type { Message } from '../../types'
import MessageBubble from './MessageBubble'
import Avatar from '../ui/Avatar'
import { formatDate, isSameDay } from '../../utils/date'

interface MessageListProps {
  messages: Message[]
  currentUsername: string
  typingUsers: string[]
  isAdmin?: boolean
  pinnedMessageIds?: string[]
  onEditMessage?: (messageId: string, newContent: string) => void
  onDeleteMessage?: (messageId: string) => void
  onReactMessage?: (messageId: string, emoji: string) => void
  onViewProfile?: (username: string) => void
  onPinMessage?: (messageId: string) => void
  onUnpinMessage?: (messageId: string) => void
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

// Returns true if two timestamps are within 5 minutes of each other
function withinGroup(a: string, b: string): boolean {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 5 * 60 * 1000
}

export default function MessageList({ messages, currentUsername, typingUsers, isAdmin, pinnedMessageIds, onEditMessage, onDeleteMessage, onReactMessage, onViewProfile, onPinMessage, onUnpinMessage }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

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

        // Grouping: same sender + within 5 minutes of previous
        const isGrouped = !!prevMessage
          && prevMessage.sender === message.sender
          && withinGroup(prevMessage.timestamp, message.timestamp)
          && !showDateDivider

        // Is this the last message in a group (show avatar here for others)
        const isLastInGroup = !nextMessage
          || nextMessage.sender !== message.sender
          || !withinGroup(message.timestamp, nextMessage.timestamp)

        const isMine = message.sender === currentUsername

        return (
          <div key={message.id}>
            {showDateDivider && <DateDivider date={message.timestamp} />}

            <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}>
              {/* Avatar space for others */}
              {!isMine && (
                <div className="flex-shrink-0 w-8">
                  {isLastInGroup ? (
                    <button onClick={() => onViewProfile?.(message.sender)} className="focus:outline-none" aria-label={`View ${message.senderName}'s profile`}><Avatar name={message.senderName} size="sm" /></button>
                  ) : (
                    <div className="w-8" />
                  )}
                </div>
              )}

              <div className="flex flex-col flex-1 min-w-0">
                <MessageBubble
                  message={message}
                  isMine={isMine}
                  isGrouped={isGrouped}
                  currentUsername={currentUsername}
                  isAdmin={isAdmin}
                  isPinned={pinnedMessageIds?.includes(message.id)}
                  onEdit={onEditMessage}
                  onDelete={onDeleteMessage}
                  onReact={onReactMessage}
                  onPin={onPinMessage}
                  onUnpin={onUnpinMessage}
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
