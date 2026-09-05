import { useEffect, useRef } from 'react'
import type { Message } from '../../types'
import type { DropdownAction } from './MessageBubble'
import { useUserCacheStore } from '../../store/userCacheStore'
import { useScrollAnchoring } from '../../hooks/useScrollAnchoring'
import { TypingIndicator, MessageRow, type MessageRowCallbacks } from './messageListShared'

export interface MessageListProps {
  messages: Message[]
  currentUsername: string
  typingUsers: string[]
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
  hasMoreOlder?: boolean
  isLoadingOlder?: boolean
  onLoadOlder?: () => void
  highlightedMessageId?: string | null
}

/** Plain, un-virtualized message list — used for shorter histories (see MessageList.tsx). */
export default function PlainMessageList({
  messages, currentUsername, typingUsers,
  onReactMessage,
  selectionMode, selectedIds, onSelectMessage, onEnterSelectionMode,
  editingMessageId, onEditMessage,
  onDropdownAction, isAdmin, pinnedMessageIds, onCallBack,
  hasMoreOlder, isLoadingOlder, onLoadOlder, highlightedMessageId,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const prefetch = useUserCacheStore((s) => s.prefetch)

  useScrollAnchoring({
    messages,
    containerRef,
    topSentinelRef,
    hasMoreOlder,
    isLoadingOlder,
    onLoadOlder,
    appendSignal: typingUsers.length,
    onAppend: () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }),
  })

  useEffect(() => {
    const senders = messages
      .filter((m) => m.sender !== currentUsername)
      .map((m) => m.sender)
    prefetch(senders)
  }, [messages, currentUsername, prefetch])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 chat-bg">
        <div className="bg-white/80 dark:bg-[#1a242b]/80 backdrop-blur rounded-2xl px-8 py-6 shadow-sm border border-white/60 dark:border-gray-700">
          <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mb-3 text-3xl mx-auto">
            💬
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">No messages yet</p>
          <p className="text-gray-400 text-sm">Be the first to say something!</p>
        </div>
      </div>
    )
  }

  const callbacks: MessageRowCallbacks = {
    currentUsername, onReactMessage, selectionMode, selectedIds, onSelectMessage, onEnterSelectionMode,
    editingMessageId, onEditMessage, onDropdownAction, isAdmin, pinnedMessageIds, onCallBack, highlightedMessageId,
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-0 chat-bg" data-testid="message-list" data-list-variant="plain">
      <div ref={topSentinelRef} data-testid="load-older-sentinel" />
      {isLoadingOlder && (
        <div className="flex justify-center py-2 text-xs text-gray-400" data-testid="loading-older-indicator">
          Loading older messages…
        </div>
      )}
      {messages.map((message, index) => (
        <MessageRow key={message.id} message={message} prevMessage={messages[index - 1]} callbacks={callbacks} />
      ))}
      <TypingIndicator users={typingUsers} />
      <div ref={bottomRef} />
    </div>
  )
}
