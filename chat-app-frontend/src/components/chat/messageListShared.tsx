import type { Message } from '../../types'
import MessageBubble, { type DropdownAction, isTrustedUrl } from './MessageBubble'
import MediaGrid from './MediaGrid'
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

function isGroupableImage(message: Message): boolean {
  return (
    message.messageType === 'IMAGE' &&
    isTrustedUrl(message.fileUrl) &&
    !message.replyToId &&
    !message.forwardedFrom &&
    !message.deleted &&
    // MessageInput sends an empty content string for an image with no caption (see
    // handleFileUploadComplete) — this is an exact signal, not a heuristic. Earlier versions of
    // this check fuzzy-matched content against the upload URL's filename, which was unreliable:
    // Cloudinary uploads with unique_filename:true, so the stored filename almost never matches
    // the original one echoed into content, making that comparison a near-permanent false
    // positive (grouping essentially never fired). Fixing the root cause on the send side made
    // the check here trivial.
    !message.content?.trim()
  )
}

// Sanity cap on a single grouped run — the grid itself only ever shows MAX_VISIBLE_TILES
// (see MediaGrid.tsx), this just bounds the underlying array for a pathological huge batch.
const MAX_GROUP_RUN = 50

export type RenderUnit =
  | { type: 'single'; message: Message }
  | { type: 'imageGroup'; messages: Message[] }

/**
 * Collapses consecutive groupable IMAGE messages (same sender, within the existing
 * same-sender/5-minute/same-day window used for bubble corner-rounding, no caption/reply/
 * forward) into a single imageGroup render unit, so a burst of photos renders as one compact
 * grid instead of one full bubble per photo. `messages` must be oldest-first (chronological).
 */
export function buildRenderUnits(messages: Message[]): RenderUnit[] {
  const units: RenderUnit[] = []
  let i = 0
  while (i < messages.length) {
    const message = messages[i]
    if (isGroupableImage(message)) {
      const run = [message]
      let j = i + 1
      while (
        j < messages.length &&
        run.length < MAX_GROUP_RUN &&
        isGroupableImage(messages[j]) &&
        messages[j].sender === message.sender &&
        withinGroup(messages[j - 1].timestamp, messages[j].timestamp) &&
        isSameDay(messages[j - 1].timestamp, messages[j].timestamp)
      ) {
        run.push(messages[j])
        j++
      }
      if (run.length >= 2) {
        units.push({ type: 'imageGroup', messages: run })
        i = j
        continue
      }
    }
    units.push({ type: 'single', message })
    i++
  }
  return units
}

export function lastMessageOfUnit(unit: RenderUnit): Message {
  return unit.type === 'single' ? unit.message : unit.messages[unit.messages.length - 1]
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
  highlightedMessageId?: string | null
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
    editingMessageId, onEditMessage, onDropdownAction, isAdmin, pinnedMessageIds, onCallBack, highlightedMessageId,
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
            highlighted={highlightedMessageId === message.id}
          />
        </div>
      </div>
    </div>
  )
}

/** One media-group row: optional date divider + the compact image grid, grouped with its neighbor when applicable. */
export function MediaGroupRow({
  messages, prevMessage, callbacks,
}: {
  messages: Message[]
  prevMessage: Message | undefined
  callbacks: MessageRowCallbacks
}) {
  const { currentUsername } = callbacks
  const first = messages[0]

  const showDateDivider = !prevMessage || !isSameDay(prevMessage.timestamp, first.timestamp)
  const isGrouped = !!prevMessage
    && prevMessage.sender === first.sender
    && withinGroup(prevMessage.timestamp, first.timestamp)
    && !showDateDivider
  const isMine = first.sender === currentUsername

  return (
    <div className={isGrouped ? 'mb-0.5' : 'mb-2'} data-testid="media-group-row">
      {showDateDivider && <DateDivider date={first.timestamp} />}
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}>
        <MediaGrid messages={messages} isMine={isMine} isGrouped={isGrouped} callbacks={callbacks} />
      </div>
    </div>
  )
}
