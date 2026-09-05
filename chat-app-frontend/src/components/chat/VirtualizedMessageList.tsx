import { useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useUserCacheStore } from '../../store/userCacheStore'
import { useScrollAnchoring } from '../../hooks/useScrollAnchoring'
import { TypingIndicator, MessageRow, type MessageRowCallbacks } from './messageListShared'
import type { MessageListProps } from './PlainMessageList'

/**
 * Virtualized message list for long histories — only mounts DOM for the
 * visible window of messages (plus overscan). See MessageList.tsx for the
 * message-count threshold that decides which implementation renders.
 */
export default function VirtualizedMessageList({
  messages, currentUsername, typingUsers,
  onReactMessage,
  selectionMode, selectedIds, onSelectMessage, onEnterSelectionMode,
  editingMessageId, onEditMessage,
  onDropdownAction, isAdmin, pinnedMessageIds, onCallBack,
  hasMoreOlder, isLoadingOlder, onLoadOlder, highlightedMessageId,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const prefetch = useUserCacheStore((s) => s.prefetch)

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 80,
    overscan: 8,
  })

  useScrollAnchoring({
    messages,
    containerRef,
    topSentinelRef,
    hasMoreOlder,
    isLoadingOlder,
    onLoadOlder,
    appendSignal: typingUsers.length,
    onAppend: () => {
      if (messages.length > 0) virtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'smooth' })
    },
  })

  useEffect(() => {
    const senders = messages
      .filter((m) => m.sender !== currentUsername)
      .map((m) => m.sender)
    prefetch(senders)
  }, [messages, currentUsername, prefetch])

  const callbacks: MessageRowCallbacks = {
    currentUsername, onReactMessage, selectionMode, selectedIds, onSelectMessage, onEnterSelectionMode,
    editingMessageId, onEditMessage, onDropdownAction, isAdmin, pinnedMessageIds, onCallBack, highlightedMessageId,
  }

  // A highlighted message (from search / jump-to-reply) may not be in the currently rendered
  // window — react-virtual only mounts DOM for visible + overscanned rows, so a plain
  // getElementById+scrollIntoView (fine for PlainMessageList) would silently no-op here.
  // Also re-checks when `messages` changes: a cross-conversation search jump sets the
  // highlight before that room's fetch has landed, so the target index isn't known yet.
  useEffect(() => {
    if (!highlightedMessageId) return
    const index = messages.findIndex((m) => m.id === highlightedMessageId)
    if (index >= 0) virtualizer.scrollToIndex(index, { align: 'center', behavior: 'smooth' })
  }, [highlightedMessageId, messages, virtualizer])

  const items = virtualizer.getVirtualItems()

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4 chat-bg relative" data-testid="message-list" data-list-variant="virtualized">
      <div ref={topSentinelRef} data-testid="load-older-sentinel" />
      {isLoadingOlder && (
        <div className="flex justify-center py-2 text-xs text-gray-400" data-testid="loading-older-indicator">
          Loading older messages…
        </div>
      )}
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
        {items.map((item) => {
          const message = messages[item.index]
          return (
            <div
              key={message.id}
              ref={virtualizer.measureElement}
              data-index={item.index}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${item.start}px)` }}
            >
              <MessageRow message={message} prevMessage={messages[item.index - 1]} callbacks={callbacks} />
            </div>
          )
        })}
      </div>
      <TypingIndicator users={typingUsers} />
    </div>
  )
}
