import type { Message } from '../../types'
import MessageBubble, { type DropdownAction } from './MessageBubble'
import { formatDate, isSameDay } from '../../utils/date'

export function DateDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center my-6" role="separator">
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      <span className="mx-3 text-xs font-medium text-gray-400 bg-white dark:bg-[#1a242b] border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1">
        {formatDate(date)}
      </span>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
    </div>
  )
}

export function TypingIndicator({ users }: { users: string[] }) {
  if (users.length === 0) return null
  const text = users.length === 1
    ? `${users[0]} is typing`
    : `${users.slice(0, 2).join(', ')} are typing`
  return (
    <div className="flex items-end gap-2 mb-3 ml-1" aria-live="polite" aria-label={text + '…'}>
      <div className="w-8 h-8 flex-shrink-0" />
      <div className="bg-white dark:bg-[#202c33] border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
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

export function withinGroup(a: string, b: string): boolean {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 5 * 60 * 1000
}

export interface MessageRowCallbacks {
  currentUsername: string
  onReactMessage?: (messageId: string, emoji: string) => void
  selectionMode?: boolean
  selectedIds?: Set<string>
  onSelectMessage?: (messageId: string) => void
  onEnterSelectionMode?: (message: Message) => void
  editingMessageId?: string | null
  onEditMessage?: (messageId: string, newContent: string) => void
  onDropdownAction?: (action: DropdownAction, message: Message) => void
  isAdmin?: boolean
  pinnedMessageIds?: string[]
  onCallBack?: () => void
}

/** One message row: optional date divider + the message bubble, grouped with its neighbor when applicable. */
export function MessageRow({
  message, prevMessage, callbacks,
}: {
  message: Message
  prevMessage: Message | undefined
  callbacks: MessageRowCallbacks
}) {
  const {
    currentUsername, onReactMessage, selectionMode, selectedIds, onSelectMessage, onEnterSelectionMode,
    editingMessageId, onEditMessage, onDropdownAction, isAdmin, pinnedMessageIds, onCallBack,
  } = callbacks

  const showDateDivider = !prevMessage || !isSameDay(prevMessage.timestamp, message.timestamp)
  const isGrouped = !!prevMessage
    && prevMessage.sender === message.sender
    && withinGroup(prevMessage.timestamp, message.timestamp)
    && !showDateDivider
  const isMine = message.sender === currentUsername

  return (
    <div>
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
            onCallBack={onCallBack}
          />
        </div>
      </div>
    </div>
  )
}
