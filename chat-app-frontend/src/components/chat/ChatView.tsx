import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Message, MessageType, Room } from '../../types'
import { useChatStore } from '../../store/chatStore'
import { messagesApi } from '../../api/messages'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import MembersPanel from './MembersPanel'
import MessageSearch from './MessageSearch'
import ForwardMessageModal from './ForwardMessageModal'
import type { DropdownAction } from './MessageBubble'

interface ChatViewProps {
  room: Room
  currentUsername: string
  onSendMessage: (content: string, fileUrl?: string, messageType?: MessageType, replyTo?: Message | null) => void
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
  onOpenThread?: (message: Message) => void
}

export default function ChatView({
  room, currentUsername, onSendMessage, onTyping, onSubscribe, onLeave,
  onEditMessage, onDeleteMessage, onReactMessage, onViewProfile, onBack,
  onKickMember, onOpenSettings, onPinMessage, onUnpinMessage, onOpenThread,
}: ChatViewProps) {
  const [showMembers, setShowMembers] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null)

  // WhatsApp-style selection state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)

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

  // Auto-exit selection mode when all messages deselected
  useEffect(() => {
    if (selectedIds.size === 0 && selectionMode) setSelectionMode(false)
  }, [selectedIds.size])

  const clearSelection = useCallback(() => { setSelectionMode(false); setSelectedIds(new Set()) }, [])

  // Escape key exits selection mode
  useEffect(() => {
    if (!selectionMode) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') clearSelection() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [selectionMode, clearSelection])

  const handleEnterSelectionMode = (msg: Message) => {
    setEditingMessageId(null)
    setSelectionMode(true)
    setSelectedIds(new Set([msg.id]))
  }

  const handleSelectMessage = (messageId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(messageId)) next.delete(messageId)
      else next.add(messageId)
      return next
    })
  }

  const handleStar = async (messageId: string) => {
    try { await messagesApi.toggleStar(messageId); fetchMessages(room.roomId) } catch { /* ignore */ }
  }

  // Selection action handlers
  const selectedMessages = messages.filter((m) => selectedIds.has(m.id))
  const singleSelected = selectedIds.size === 1 ? selectedMessages[0] : null
  const allSelectedAreMine = selectedMessages.length > 0 && selectedMessages.every((m) => m.sender === currentUsername)

  const handleSelectionReply = () => {
    if (singleSelected) { setReplyTo(singleSelected); clearSelection() }
  }
  const handleSelectionForward = () => {
    if (singleSelected) { setForwardMessage(singleSelected); clearSelection() }
  }
  const handleSelectionStar = async () => {
    await Promise.all(selectedMessages.map((m) => messagesApi.toggleStar(m.id).catch(() => {})))
    fetchMessages(room.roomId)
    clearSelection()
  }
  const handleSelectionDelete = () => {
    selectedMessages.forEach((m) => onDeleteMessage?.(m.id))
    clearSelection()
  }
  const handleSelectionEdit = () => {
    if (singleSelected) { setEditingMessageId(singleSelected.id); clearSelection() }
  }
  const handleSelectionPin = () => {
    if (!singleSelected) return
    const isPinned = (room.pinnedMessages ?? []).includes(singleSelected.id)
    if (isPinned) onUnpinMessage?.(singleSelected.id)
    else onPinMessage?.(singleSelected.id)
    clearSelection()
  }
  const isPinnedSelected = singleSelected ? (room.pinnedMessages ?? []).includes(singleSelected.id) : false

  const handleEditSave = (messageId: string, newContent: string) => {
    onEditMessage?.(messageId, newContent)
    setEditingMessageId(null)
  }

  const handleDropdownAction = (action: DropdownAction, message: Message) => {
    switch (action) {
      case 'reply': setReplyTo(message); break
      case 'forward': setForwardMessage(message); break
      case 'star': handleStar(message.id); break
      case 'delete': onDeleteMessage?.(message.id); break
      case 'pin': onPinMessage?.(message.id); break
      case 'unpin': onUnpinMessage?.(message.id); break
      case 'thread': onOpenThread?.(message); break
    }
  }

  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header — swaps to selection action bar in selection mode */}
        {selectionMode ? (
          <div className="px-2 py-2 bg-white flex items-center gap-1 shadow-md z-10 border-b border-gray-100" data-testid="selection-action-bar">
            {/* Cancel */}
            <button
              onClick={clearSelection}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Cancel selection"
              data-testid="cancel-selection-btn"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Count */}
            <span className="text-sm font-semibold text-gray-800 flex-1 ml-1" data-testid="selection-count">
              {selectedIds.size} selected
            </span>

            {/* Star */}
            <button
              onClick={handleSelectionStar}
              className="p-2 text-gray-500 hover:text-yellow-500 hover:bg-yellow-50 rounded-full transition-colors"
              aria-label="Star selected"
              title="Star"
              data-testid="selection-star-btn"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>

            {/* Reply — only if 1 selected */}
            {selectedIds.size === 1 && (
              <button
                onClick={handleSelectionReply}
                className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                aria-label="Reply to selected"
                title="Reply"
                data-testid="selection-reply-btn"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
            )}

            {/* Forward — only if 1 selected */}
            {selectedIds.size === 1 && (
              <button
                onClick={handleSelectionForward}
                className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                aria-label="Forward selected"
                title="Forward"
                data-testid="selection-forward-btn"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}

            {/* Edit — only if 1 own message selected */}
            {selectedIds.size === 1 && allSelectedAreMine && (
              <button
                onClick={handleSelectionEdit}
                className="p-2 text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors"
                aria-label="Edit selected"
                title="Edit"
                data-testid="selection-edit-btn"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}

            {/* Delete — only if all selected are mine */}
            {allSelectedAreMine && (
              <button
                onClick={handleSelectionDelete}
                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                aria-label="Delete selected"
                title="Delete"
                data-testid="selection-delete-btn"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}

            {/* Pin/Unpin — admin only, 1 message */}
            {isAdmin && selectedIds.size === 1 && (
              <button
                onClick={handleSelectionPin}
                className={`p-2 rounded-full transition-colors ${isPinnedSelected ? 'text-amber-500 hover:bg-amber-50' : 'text-gray-500 hover:text-amber-500 hover:bg-amber-50'}`}
                aria-label={isPinnedSelected ? 'Unpin selected' : 'Pin selected'}
                title={isPinnedSelected ? 'Unpin' : 'Pin'}
                data-testid="selection-pin-btn"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V4z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div className="px-3 md:px-4 py-2.5 bg-[#075e54] flex items-center justify-between shadow-md z-10">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              {onBack && (
                <button
                  onClick={onBack}
                  className="md:hidden p-1 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
                  aria-label="Back to sidebar"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div className="w-8 h-8 md:w-9 md:h-9 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm md:text-base">#</span>
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-white truncate text-sm md:text-[15px]">{room.name}</h2>
                {room.description ? (
                  <p className="text-xs text-white/60 truncate">{room.description}</p>
                ) : (
                  <p className="text-xs text-white/50">{room.memberCount} {room.memberCount === 1 ? 'member' : 'members'}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0 md:gap-1 flex-shrink-0">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`p-1.5 md:p-2 rounded-full transition-colors ${showSearch ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                aria-label="Search messages"
                data-testid="search-toggle-btn"
                title="Search messages"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button
                onClick={() => setShowMembers(!showMembers)}
                className={`p-1.5 md:p-2 rounded-full transition-colors ${showMembers ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                aria-label="Toggle members panel"
                data-testid="members-toggle-btn"
                title="Members"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {isAdmin && onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="p-1.5 md:p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  title="Room settings"
                  data-testid="room-settings-btn"
                  aria-label="Room settings"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 016 0z" />
                  </svg>
                </button>
              )}
              {onLeave && (
                <button
                  onClick={onLeave}
                  className="p-1.5 md:p-2 text-white/70 hover:text-red-300 hover:bg-white/10 rounded-full transition-colors"
                  title="Leave room"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pinned messages bar */}
        {(room.pinnedMessages ?? []).length > 0 && (
          <PinnedBar
            pinnedMessageIds={room.pinnedMessages!}
            messages={messages}
            onUnpin={onUnpinMessage}
            canUnpin={isAdmin}
          />
        )}

        {/* In-room search */}
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
            onReactMessage={onReactMessage}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onSelectMessage={handleSelectMessage}
            onEnterSelectionMode={handleEnterSelectionMode}
            editingMessageId={editingMessageId}
            onEditMessage={handleEditSave}
            onDropdownAction={handleDropdownAction}
            isAdmin={isAdmin}
            pinnedMessageIds={room.pinnedMessages}
          />
        )}

        <MessageInput
          onSend={onSendMessage}
          onTyping={onTyping}
          placeholder={`Message #${room.name}`}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />

        {forwardMessage && (
          <ForwardMessageModal
            message={forwardMessage}
            onClose={() => setForwardMessage(null)}
          />
        )}
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
