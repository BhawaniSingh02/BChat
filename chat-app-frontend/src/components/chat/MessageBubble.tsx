import { useState, useRef, useEffect } from 'react'
import type { Message } from '../../types'
import { formatTime } from '../../utils/date'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉']

interface MessageBubbleProps {
  message: Message
  isMine: boolean
  isGrouped?: boolean
  showSender?: boolean
  currentUsername?: string
  isAdmin?: boolean
  isPinned?: boolean
  onEdit?: (messageId: string, newContent: string) => void
  onDelete?: (messageId: string) => void
  onReact?: (messageId: string, emoji: string) => void
  onPin?: (messageId: string) => void
  onUnpin?: (messageId: string) => void
}

function ReadTicks({ readBy, sender, isMine }: { readBy: string[]; sender: string; isMine: boolean }) {
  if (!isMine) return null
  const readByOthers = readBy.filter((u) => u !== sender).length > 0
  // WhatsApp-style SVG double-tick (blue=read, gray=delivered)
  const color = readByOthers ? '#53bdeb' : '#8696a0'
  return (
    <svg
      width="16" height="11" viewBox="0 0 16 11"
      className="ml-0.5 inline-block flex-shrink-0"
      aria-label={readByOthers ? 'Read' : 'Delivered'}
    >
      {/* first tick */}
      <path d="M11.071.653 4.241 7.384 1.361 4.38.293 5.487l3.948 4.11 7.9-7.84z" fill={color} />
      {/* second tick */}
      <path d="M15.707.653 8.877 7.384 7.4 5.863 6.33 6.97l2.547 2.628 7.9-7.84z" fill={color} />
    </svg>
  )
}

export default function MessageBubble({ message, isMine, isGrouped = false, showSender, currentUsername, isAdmin, isPinned, onEdit, onDelete, onReact, onPin, onUnpin }: MessageBubbleProps) {
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus()
      textareaRef.current?.select()
    }
  }, [editing])

  useEffect(() => {
    if (!showEmojiPicker) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmojiPicker])

  const handleEditSave = () => {
    const trimmed = editContent.trim()
    if (trimmed && trimmed !== message.content) {
      onEdit?.(message.id, trimmed)
    }
    setEditing(false)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEditSave()
    } else if (e.key === 'Escape') {
      setEditContent(message.content)
      setEditing(false)
    }
  }

  const handleReact = (emoji: string) => {
    onReact?.(message.id, emoji)
    setShowEmojiPicker(false)
  }

  const reactions = message.reactions ?? {}
  const hasReactions = Object.keys(reactions).length > 0

  if (message.deleted) {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1 msg-enter`}>
        <div
          className="max-w-[70%] rounded-2xl px-4 py-2 bg-white/60 text-gray-400 border border-gray-200/80"
          data-testid="message-bubble"
        >
          <p className="text-sm italic">{message.content}</p>
          <div className="flex items-center justify-end mt-0.5">
            <span className="text-xs text-gray-400">{formatTime(message.timestamp)}</span>
          </div>
        </div>
      </div>
    )
  }

  /* ── Action toolbar (appears on hover) ── */
  const ActionBar = () => (
    <div className={`flex items-center gap-0.5 self-end mb-1 ${isMine ? 'mr-1 flex-row' : 'ml-1 flex-row-reverse'}`}>
      {onReact && (
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 hover:bg-yellow-50 hover:border-yellow-300 transition-colors"
            aria-label="React to message"
            data-testid="react-btn"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          {showEmojiPicker && (
            <div
              className={`absolute bottom-9 ${isMine ? 'right-0' : 'left-0'} flex gap-1 p-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-20`}
              data-testid="emoji-picker"
            >
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className="text-xl hover:scale-125 transition-transform leading-none p-0.5"
                  data-testid={`emoji-option-${emoji}`}
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {isMine && onEdit && (
        <button
          onClick={() => { setEditContent(message.content); setEditing(true) }}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          aria-label="Edit message"
          data-testid="edit-message-btn"
        >
          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}
      {isMine && onDelete && (
        <button
          onClick={() => onDelete(message.id)}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 hover:bg-red-50 hover:border-red-200 transition-colors"
          aria-label="Delete message"
          data-testid="delete-message-btn"
        >
          <svg className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
      {isAdmin && !message.deleted && (isPinned ? onUnpin : onPin) && (
        <button
          onClick={() => isPinned ? onUnpin?.(message.id) : onPin?.(message.id)}
          className={`w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-sm border transition-colors ${isPinned ? 'border-amber-300 hover:bg-amber-50' : 'border-gray-200 hover:bg-amber-50 hover:border-amber-300'}`}
          aria-label={isPinned ? 'Unpin message' : 'Pin message'}
          data-testid="pin-message-btn"
          title={isPinned ? 'Unpin' : 'Pin message'}
        >
          <svg className={`w-3.5 h-3.5 ${isPinned ? 'text-amber-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V4z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  )

  return (
    <div
      id={`msg-${message.id}`}
      className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mb-0.5' : 'mb-2'} group msg-enter`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowEmojiPicker(false) }}
    >
      <div className={`flex items-end gap-1 max-w-[75%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Bubble */}
        <div className="flex flex-col">
          <div
            className={`
              relative px-3.5 py-2 shadow-sm
              ${isMine
                ? `bg-[#dcf8c6] text-gray-900 rounded-t-2xl rounded-bl-2xl ${!isGrouped ? 'rounded-br-sm bubble-mine' : 'rounded-br-2xl'}`
                : `bg-white text-gray-900 rounded-t-2xl rounded-br-2xl ${!isGrouped ? 'rounded-bl-sm bubble-other' : 'rounded-bl-2xl'}`
              }
            `}
            data-testid="message-bubble"
          >
            {showSender && !isMine && (
              <p className="text-xs font-bold text-emerald-600 mb-0.5">{message.senderName}</p>
            )}

            {editing ? (
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onBlur={handleEditSave}
                className="w-full bg-transparent text-sm resize-none focus:outline-none border-b border-gray-400/50 pb-1 min-w-[160px]"
                rows={2}
                aria-label="Edit message input"
                data-testid="edit-message-input"
              />
            ) : message.messageType === 'IMAGE' && message.fileUrl ? (
              <img
                src={message.fileUrl}
                alt="shared"
                className="rounded-xl max-w-full mb-1 max-h-64 object-cover"
                loading="lazy"
              />
            ) : message.messageType === 'FILE' && message.fileUrl ? (
              <a
                href={message.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline"
              >
                📎 Download file
              </a>
            ) : (
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
            )}

            {/* Time + edited + read ticks — inline at bottom right */}
            <div className="flex items-center justify-end gap-0.5 mt-0.5 -mb-0.5">
              {message.edited && (
                <span className="text-[10px] text-gray-400 mr-0.5" title="Edited">edited</span>
              )}
              <span className="text-[11px] text-gray-400">{formatTime(message.timestamp)}</span>
              <ReadTicks readBy={message.readBy} sender={message.sender} isMine={isMine} />
            </div>
          </div>

          {/* Reaction pills */}
          {hasReactions && (
            <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`} data-testid="reaction-pills">
              {Object.entries(reactions).map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => onReact?.(message.id, emoji)}
                  className={`
                    flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full border shadow-sm transition-all
                    ${currentUsername && users.includes(currentUsername)
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-700 font-medium'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }
                  `}
                  aria-label={`${emoji} ${users.length}`}
                  data-testid={`reaction-pill-${emoji}`}
                >
                  <span>{emoji}</span>
                  <span>{users.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hover action bar */}
        {hovered && !editing && (
          <ActionBar />
        )}
      </div>
    </div>
  )
}
