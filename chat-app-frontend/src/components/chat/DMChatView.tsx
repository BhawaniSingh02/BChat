import { useEffect, useMemo, useState } from 'react'
import type { DirectConversation, Message, MessageType } from '../../types'
import { useDMStore } from '../../store/dmStore'
import { usePresenceStore } from '../../store/presenceStore'
import { useUserCacheStore } from '../../store/userCacheStore'
import { messagesApi } from '../../api/messages'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import Avatar from '../ui/Avatar'
import ConversationSettingsModal from './ConversationSettingsModal'
import ForwardMessageModal from './ForwardMessageModal'
import type { DropdownAction } from './MessageBubble'

interface DMChatViewProps {
  conversation: DirectConversation
  currentUsername: string
  onSend: (content: string, fileUrl?: string, messageType?: MessageType, replyTo?: Message | null) => void
  onViewProfile?: (username: string) => void
  onEditMessage?: (messageId: string, newContent: string) => void
  onDeleteMessage?: (messageId: string) => void
  onReactMessage?: (messageId: string, emoji: string) => void
  onBack?: () => void
  onConversationUpdated?: (updated: DirectConversation) => void
}

export default function DMChatView({
  conversation, currentUsername, onSend, onViewProfile,
  onEditMessage, onDeleteMessage, onReactMessage, onBack, onConversationUpdated,
}: DMChatViewProps) {
  const rawMessages = useDMStore((s) => s.messages[conversation.id])
  const messages = useMemo(() => rawMessages ?? [], [rawMessages])
  const isLoading = useDMStore((s) => s.isLoading)
  const fetchMessages = useDMStore((s) => s.fetchMessages)
  const isOnline = usePresenceStore((s) => s.isOnline)

  const otherUser = conversation.participants.find((p) => p !== currentUsername) ?? '?'
  const online = isOnline(otherUser)
  const fetchUser = useUserCacheStore((s) => s.fetchUser)
  const cache = useUserCacheStore((s) => s.cache)

  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)

  // WhatsApp-style selection state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)

  const isMuted = !!conversation.mutedBy?.[currentUsername]

  useEffect(() => {
    fetchMessages(conversation.id)
    fetchUser(otherUser)
    // Check if we have blocked the other user
    messagesApi.getBlockedUsers()
      .then((users: { username: string }[]) => {
        setIsBlocked(users.some((u) => u.username === otherUser))
      })
      .catch(() => {})
  }, [conversation.id, otherUser])

  // Auto-exit selection when nothing selected
  useEffect(() => {
    if (selectedIds.size === 0 && selectionMode) setSelectionMode(false)
  }, [selectedIds.size])

  // Escape to exit selection
  useEffect(() => {
    if (!selectionMode) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') clearSelection() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [selectionMode])

  const clearSelection = () => { setSelectionMode(false); setSelectedIds(new Set()) }

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
    fetchMessages(conversation.id)
    clearSelection()
  }
  const handleSelectionDelete = () => {
    selectedMessages.forEach((m) => onDeleteMessage?.(m.id))
    clearSelection()
  }
  const handleSelectionEdit = () => {
    if (singleSelected) { setEditingMessageId(singleSelected.id); clearSelection() }
  }
  const handleEditSave = (messageId: string, newContent: string) => {
    onEditMessage?.(messageId, newContent)
    setEditingMessageId(null)
  }

  const handleDropdownAction = (action: DropdownAction, message: Message) => {
    switch (action) {
      case 'reply': setReplyTo(message); break
      case 'forward': setForwardMessage(message); break
      case 'star': messagesApi.toggleStar(message.id).then(() => fetchMessages(conversation.id)).catch(() => {}); break
      case 'delete': onDeleteMessage?.(message.id); break
      default: break // no pin/unpin in DMs
    }
  }

  const handleBlock = async (username: string) => {
    try {
      await messagesApi.blockUser(username)
      setIsBlocked(true)
    } catch { /* ignore */ }
  }

  const handleUnblock = async (username: string) => {
    try {
      await messagesApi.unblockUser(username)
      setIsBlocked(false)
    } catch { /* ignore */ }
  }
  const handleConversationUpdated = (updated: DirectConversation) => {
    onConversationUpdated?.(updated)
    setShowSettings(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header — swaps to selection action bar */}
      {selectionMode ? (
        <div className="px-2 py-2 bg-white flex items-center gap-1 shadow-md z-10 border-b border-gray-100" data-testid="selection-action-bar">
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

          <span className="text-sm font-semibold text-gray-800 flex-1 ml-1" data-testid="selection-count">
            {selectedIds.size} selected
          </span>

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
        </div>
      ) : (
        <div className="px-4 py-2.5 bg-[#075e54] flex items-center gap-3 shadow-md z-10">
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
            <div className="flex items-center gap-2">
              <p className="text-xs text-white/60">{online ? 'online' : 'offline'}</p>
              {isMuted && (
                <span className="text-[10px] text-white/50 flex items-center gap-0.5" data-testid="muted-indicator">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                  Muted
                </span>
              )}
              {conversation.disappearingMessagesTimer && conversation.disappearingMessagesTimer !== 'OFF' && (
                <span className="text-[10px] text-white/50 flex items-center gap-0.5" data-testid="disappearing-indicator">
                  ⏱ {conversation.disappearingMessagesTimer}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Conversation settings"
            data-testid="conversation-settings-btn"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      )}

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
          onReactMessage={onReactMessage}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onSelectMessage={handleSelectMessage}
          onEnterSelectionMode={handleEnterSelectionMode}
          editingMessageId={editingMessageId}
          onEditMessage={handleEditSave}
          onDropdownAction={handleDropdownAction}
        />
      )}

      {isBlocked ? (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-center gap-2" data-testid="blocked-banner">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <span className="text-sm text-gray-500">You blocked {otherUser}.</span>
          <button
            onClick={() => handleUnblock(otherUser)}
            className="text-sm text-emerald-600 font-medium hover:underline"
            data-testid="unblock-inline-btn"
          >
            Unblock
          </button>
        </div>
      ) : (
        <MessageInput
          onSend={onSend}
          placeholder={`Message ${otherUser}`}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      )}

      {showSettings && (
        <ConversationSettingsModal
          conversation={conversation}
          currentUsername={currentUsername}
          otherUsername={otherUser}
          onClose={() => setShowSettings(false)}
          onUpdated={handleConversationUpdated}
          onBlock={handleBlock}
          onUnblock={handleUnblock}
          isBlocked={isBlocked}
        />
      )}

      {forwardMessage && (
        <ForwardMessageModal
          message={forwardMessage}
          onClose={() => setForwardMessage(null)}
        />
      )}
    </div>
  )
}
