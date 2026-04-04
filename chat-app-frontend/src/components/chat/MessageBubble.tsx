import { memo, useState, useRef, useEffect } from 'react'
import type { Message } from '../../types'
import { formatTime } from '../../utils/date'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉']

const CLOUDINARY_ORIGINS = ['https://res.cloudinary.com', 'https://res-console.cloudinary.com']

function getLocalApiOrigin(): string {
  try {
    const base = import.meta.env.VITE_API_BASE_URL as string | undefined
    return base ? new URL(base).origin : ''
  } catch {
    return ''
  }
}
const LOCAL_API_ORIGIN = getLocalApiOrigin()
const IS_DEV = import.meta.env.DEV

function isTrustedUrl(url: string | undefined): boolean {
  if (!url) return false
  try {
    const { origin, hostname } = new URL(url)
    if (CLOUDINARY_ORIGINS.some((o) => origin === o || origin.endsWith('.cloudinary.com'))) return true
    if (LOCAL_API_ORIGIN && origin === LOCAL_API_ORIGIN) return true
    if (IS_DEV && hostname === 'localhost') return true
    return false
  } catch {
    return false
  }
}

export type DropdownAction = 'reply' | 'forward' | 'star' | 'delete' | 'pin' | 'unpin' | 'thread'

/** Inline audio player for voice messages (Phase 24) */
function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause() } else { audio.play().catch(() => {}) }
  }

  const handleTimeUpdate = () => setCurrentTime(audioRef.current?.currentTime ?? 0)
  const handleDurationChange = () => setDuration(audioRef.current?.duration ?? 0)
  const handleEnded = () => { setPlaying(false); setCurrentTime(0) }

  const formatSecs = (s: number) => {
    if (!isFinite(s)) return '0:00'
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-2 min-w-[200px]" data-testid="audio-player">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onEnded={handleEnded}
        preload="metadata"
      />
      <button
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-[#075e54] hover:bg-[#128c7e] text-white flex items-center justify-center flex-shrink-0 transition-colors"
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}
        data-testid="audio-play-btn"
      >
        {playing ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="flex-1 flex flex-col gap-0.5">
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onChange={(e) => {
            const t = Number(e.target.value)
            if (audioRef.current) { audioRef.current.currentTime = t }
            setCurrentTime(t)
          }}
          className="w-full h-1.5 accent-[#075e54] cursor-pointer"
          aria-label="Audio scrubber"
          data-testid="audio-scrubber"
        />
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>{formatSecs(currentTime)}</span>
          <span>{formatSecs(duration)}</span>
        </div>
      </div>
    </div>
  )
}

/** Returns true if the message content is a missed call notification. */
function isMissedCallMessage(content: string): boolean {
  const trimmed = content.trim()
  return (
    trimmed.startsWith('📞') || trimmed.startsWith('📹')
  ) && /Missed (audio|video) call/i.test(trimmed)
}

interface MessageBubbleProps {
  message: Message
  isMine: boolean
  isGrouped?: boolean
  showSender?: boolean
  currentUsername?: string
  onEdit?: (messageId: string, newContent: string) => void
  onReact?: (messageId: string, emoji: string) => void
  onScrollToMessage?: (messageId: string) => void
  // Desktop dropdown
  onDropdownAction?: (action: DropdownAction, message: Message) => void
  isAdmin?: boolean
  isPinned?: boolean
  // Selection (mobile/touch long-press)
  isSelected?: boolean
  selectionMode?: boolean
  onSelect?: (messageId: string) => void
  onEnterSelectionMode?: (message: Message) => void
  // Inline edit trigger from selection action bar
  isEditing?: boolean
  /** Called when user taps "Call back" on a missed call bubble */
  onCallBack?: () => void
}

function ReadTicks({ readBy, sender, isMine }: { readBy: string[]; sender: string; isMine: boolean }) {
  if (!isMine) return null
  const readByOthers = readBy.filter((u) => u !== sender).length > 0
  const color = readByOthers ? '#53bdeb' : '#8696a0'
  return (
    <svg
      width="16" height="11" viewBox="0 0 16 11"
      className="ml-0.5 inline-block flex-shrink-0"
      aria-label={readByOthers ? 'Read' : 'Delivered'}
    >
      <path d="M11.071.653 4.241 7.384 1.361 4.38.293 5.487l3.948 4.11 7.9-7.84z" fill={color} />
      <path d="M15.707.653 8.877 7.384 7.4 5.863 6.33 6.97l2.547 2.628 7.9-7.84z" fill={color} />
    </svg>
  )
}

function MessageMeta({
  message, isMine, isStarredByMe, selectionMode, onShowReceipts, block = false,
}: {
  message: Message
  isMine: boolean
  isStarredByMe: boolean
  selectionMode: boolean
  onShowReceipts: () => void
  block?: boolean
}) {
  const inner = (
    <>
      {message.edited && <span className="text-[10px] text-gray-400" title="Edited">edited</span>}
      {isStarredByMe && (
        <svg className="w-3 h-3 text-yellow-400 fill-yellow-400" viewBox="0 0 24 24" data-testid="star-indicator">
          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      )}
      <span className="text-[11px] text-gray-400">{formatTime(message.timestamp)}</span>
      <button
        onClick={selectionMode ? undefined : () => isMine && onShowReceipts()}
        className={isMine && !selectionMode ? 'cursor-pointer' : 'cursor-default pointer-events-none'}
        aria-label="View read receipts"
        data-testid="read-ticks-btn"
      >
        <ReadTicks readBy={message.readBy} sender={message.sender} isMine={isMine} />
      </button>
    </>
  )
  if (block) {
    return <div className="flex items-center justify-end gap-0.5 mt-0.5 -mb-0.5">{inner}</div>
  }
  return (
    <span className="inline-flex items-center gap-0.5 ml-2 align-bottom whitespace-nowrap relative top-[1px]">
      {inner}
    </span>
  )
}

function MenuItem({
  icon, label, onClick, danger = false, testId,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
  testId?: string
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`
        w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors
        ${danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'}
      `}
    >
      <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">{icon}</span>
      {label}
    </button>
  )
}

function MessageBubble({
  message, isMine, isGrouped = false, showSender, currentUsername,
  onEdit, onReact, onScrollToMessage,
  onDropdownAction, isAdmin = false, isPinned = false,
  isSelected = false, selectionMode = false, onSelect, onEnterSelectionMode,
  isEditing = false, onCallBack,
}: MessageBubbleProps) {
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [dropdownDir, setDropdownDir] = useState<'down' | 'up'>('down')
  const [showReadReceipts, setShowReadReceipts] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const dropdownTriggerRef = useRef<HTMLButtonElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasLongPress = useRef(false)

  const isStarredByMe = currentUsername ? (message.starred ?? []).includes(currentUsername) : false
  const myReaction = currentUsername
    ? Object.entries(message.reactions ?? {}).find(([, users]) => (users as string[]).includes(currentUsername))?.[0]
    : undefined

  // Sync isEditing prop → local editing state
  useEffect(() => {
    if (isEditing && !editing) {
      setEditContent(message.content)
      setEditing(true)
    }
  }, [isEditing])

  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus()
      textareaRef.current?.select()
    }
  }, [editing])

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmojiPicker])

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        dropdownTriggerRef.current && !dropdownTriggerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDropdown])

  // Long press (500ms) → selection mode on mobile/touch
  const startLongPress = () => {
    if (selectionMode || editing) return
    wasLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      wasLongPress.current = true
      onEnterSelectionMode?.(message)
    }, 500)
  }

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleBubbleClick = () => {
    if (editing) return
    if (wasLongPress.current) { wasLongPress.current = false; return }
    if (selectionMode) onSelect?.(message.id)
  }

  const handleEditSave = () => {
    const trimmed = editContent.trim()
    if (trimmed && trimmed !== message.content) onEdit?.(message.id, trimmed)
    setEditing(false)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave() }
    else if (e.key === 'Escape') { setEditContent(message.content); setEditing(false) }
  }

  const handleReact = (emoji: string) => {
    onReact?.(message.id, emoji)
    setShowEmojiPicker(false)
  }

  // Dropdown action dispatcher
  const triggerDropdownAction = (action: DropdownAction) => {
    setShowDropdown(false)
    onDropdownAction?.(action, message)
  }

  const handleCopy = () => {
    setShowDropdown(false)
    if (message.content) navigator.clipboard.writeText(message.content).catch(() => {})
  }

  const handleSelectFromDropdown = () => {
    setShowDropdown(false)
    onEnterSelectionMode?.(message)
  }

  const handleMessageInfo = () => {
    setShowDropdown(false)
    setShowReadReceipts(true)
  }

  const reactions = message.reactions ?? {}
  const hasReactions = Object.keys(reactions).length > 0
  const showDropdownTrigger = hovered && !editing && !selectionMode && !message.deleted && onDropdownAction

  if (message.deleted) {
    return (
      <div
        className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mb-0.5' : 'mb-2'} msg-enter`}
        data-testid="message-row"
      >
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

  return (
    <div
      id={`msg-${message.id}`}
      className={`
        ${isGrouped ? 'mb-0.5' : 'mb-2'}
        msg-enter
        ${isSelected ? 'bg-emerald-50' : ''}
        ${selectionMode ? 'cursor-pointer select-none' : ''}
        transition-colors duration-100 rounded-sm
      `}
      onClick={handleBubbleClick}
      onMouseEnter={() => { if (!selectionMode) setHovered(true) }}
      onMouseDown={!selectionMode ? startLongPress : undefined}
      onMouseUp={cancelLongPress}
      onMouseLeave={() => { cancelLongPress(); setHovered(false); setShowEmojiPicker(false); setShowDropdown(false) }}
      onTouchStart={!selectionMode ? startLongPress : undefined}
      onTouchEnd={cancelLongPress}
      onTouchMove={cancelLongPress}
    >
      <div className="flex items-center gap-2">
        {/* Checkbox — selection mode (mobile/touch) */}
        {selectionMode && (
          <div
            className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              isSelected ? 'bg-[#075e54] border-[#075e54]' : 'border-gray-400 bg-white'
            }`}
            data-testid="selection-checkbox"
          >
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}

        {/* Message content row */}
        <div
          data-testid="message-row"
          className={`flex-1 flex ${isMine ? 'justify-end' : 'justify-start'}`}
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

                {/* Forwarded label */}
                {message.forwardedFrom && (
                  <div className="flex items-center gap-1 text-xs text-gray-400 italic mb-1" data-testid="forwarded-label">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Forwarded from <strong>{message.forwardedFrom}</strong></span>
                  </div>
                )}

                {/* Quote reply bubble */}
                {message.replyToId && message.replyToSnippet && (
                  <button
                    onClick={selectionMode ? undefined : () => onScrollToMessage?.(message.replyToId!)}
                    className={`w-full text-left mb-1.5 rounded-lg overflow-hidden border-l-4 px-2 py-1.5 ${isMine ? 'border-emerald-500 bg-emerald-600/20' : 'border-blue-500 bg-blue-50/80'}`}
                    data-testid="reply-quote"
                  >
                    <p className={`text-[11px] font-semibold ${isMine ? 'text-emerald-700' : 'text-blue-700'}`}>
                      {message.replyToSender ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-600 truncate">{message.replyToSnippet}</p>
                  </button>
                )}

                {/* Body + timestamp */}
                {editing ? (
                  <>
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
                    <MessageMeta message={message} isMine={isMine} isStarredByMe={isStarredByMe} selectionMode={selectionMode} onShowReceipts={() => setShowReadReceipts(v => !v)} block />
                  </>
                ) : message.messageType === 'IMAGE' && isTrustedUrl(message.fileUrl) ? (
                  <>
                    <img src={message.fileUrl} alt="shared" className="rounded-xl max-w-full mb-1 max-h-64 object-cover" loading="lazy" />
                    <MessageMeta message={message} isMine={isMine} isStarredByMe={isStarredByMe} selectionMode={selectionMode} onShowReceipts={() => setShowReadReceipts(v => !v)} block />
                  </>
                ) : message.messageType === 'VIDEO' && isTrustedUrl(message.fileUrl) ? (
                  <>
                    <video src={message.fileUrl} controls controlsList="nodownload" className="rounded-xl max-w-full mb-1 max-h-64" preload="metadata" data-testid="message-video" />
                    <MessageMeta message={message} isMine={isMine} isStarredByMe={isStarredByMe} selectionMode={selectionMode} onShowReceipts={() => setShowReadReceipts(v => !v)} block />
                  </>
                ) : message.messageType === 'AUDIO' && isTrustedUrl(message.fileUrl) ? (
                  <>
                    <AudioPlayer src={message.fileUrl!} />
                    <MessageMeta message={message} isMine={isMine} isStarredByMe={isStarredByMe} selectionMode={selectionMode} onShowReceipts={() => setShowReadReceipts(v => !v)} block />
                  </>
                ) : message.messageType === 'FILE' && isTrustedUrl(message.fileUrl) ? (
                  <>
                    <a href={message.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline">
                      📎 Download file
                    </a>
                    <MessageMeta message={message} isMine={isMine} isStarredByMe={isStarredByMe} selectionMode={selectionMode} onShowReceipts={() => setShowReadReceipts(v => !v)} block />
                  </>
                ) : isMissedCallMessage(message.content) ? (
                  <>
                    <div className="flex items-center gap-2" data-testid="missed-call-bubble">
                      <span className="text-lg" aria-hidden="true">
                        {message.content.startsWith('📹') ? '📹' : '📞'}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-500">{message.content}</p>
                        {onCallBack && !isMine && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onCallBack() }}
                            className="text-xs text-emerald-600 font-semibold hover:underline mt-0.5"
                            aria-label="Call back"
                            data-testid="call-back-btn"
                          >
                            Call back
                          </button>
                        )}
                      </div>
                    </div>
                    <MessageMeta message={message} isMine={isMine} isStarredByMe={isStarredByMe} selectionMode={selectionMode} onShowReceipts={() => setShowReadReceipts(v => !v)} block />
                  </>
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {message.content}
                    <MessageMeta message={message} isMine={isMine} isStarredByMe={isStarredByMe} selectionMode={selectionMode} onShowReceipts={() => setShowReadReceipts(v => !v)} />
                  </p>
                )}

                {/* Read receipt popup */}
                {showReadReceipts && isMine && message.readAt && Object.keys(message.readAt).length > 0 && (
                  <div
                    className="absolute bottom-8 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-30 min-w-[180px]"
                    data-testid="read-receipts-popup"
                  >
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 px-1">Read by</p>
                    {Object.entries(message.readAt).map(([user, time]) => (
                      <div key={user} className="flex items-center justify-between px-1 py-0.5 text-xs text-gray-700">
                        <span className="font-medium">{user}</span>
                        <span className="text-gray-400 ml-2">{formatTime(time as string)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Desktop dropdown trigger (▾ chevron at bubble corner) ── */}
                {showDropdownTrigger && (
                  <button
                    ref={dropdownTriggerRef}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!showDropdown) {
                        const rect = dropdownTriggerRef.current?.getBoundingClientRect()
                        if (rect) {
                          setDropdownDir(window.innerHeight - rect.bottom < 260 ? 'up' : 'down')
                        }
                      }
                      setShowDropdown((d) => !d)
                    }}
                    className={`
                      absolute top-0 right-0
                      w-7 h-7 flex items-center justify-center
                      rounded-tr-2xl rounded-bl-lg
                      ${isMine ? 'bg-gradient-to-bl from-[#d4f5c0] to-transparent' : 'bg-gradient-to-bl from-gray-100 to-transparent'}
                      text-gray-500 hover:text-gray-700
                      transition-opacity
                    `}
                    aria-label="Message options"
                    data-testid="message-dropdown-trigger"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}

                {/* ── Dropdown menu ── */}
                {showDropdown && (
                  <div
                    ref={dropdownRef}
                    onClick={(e) => e.stopPropagation()}
                    className={`
                      absolute ${dropdownDir === 'up' ? 'bottom-7' : 'top-7'} ${isMine ? 'right-0' : 'left-0'}
                      bg-white rounded-2xl shadow-2xl border border-gray-100/80 z-40
                      py-1.5 min-w-[190px] overflow-hidden
                    `}
                    data-testid="message-dropdown"
                  >
                    {/* Reply */}
                    <MenuItem
                      testId="dropdown-reply"
                      onClick={() => triggerDropdownAction('reply')}
                      label="Reply"
                      icon={
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                      }
                    />

                    {/* Reply in Thread — Phase 27 */}
                    {!message.threadId && (
                      <MenuItem
                        testId="dropdown-thread"
                        onClick={() => triggerDropdownAction('thread')}
                        label="Reply in Thread"
                        icon={
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        }
                      />
                    )}

                    {/* Copy — text messages only */}
                    {message.messageType === 'TEXT' && (
                      <MenuItem
                        testId="dropdown-copy"
                        onClick={handleCopy}
                        label="Copy"
                        icon={
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        }
                      />
                    )}

                    {/* Forward */}
                    <MenuItem
                      testId="dropdown-forward"
                      onClick={() => triggerDropdownAction('forward')}
                      label="Forward"
                      icon={
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      }
                    />

                    {/* Star / Unstar */}
                    <MenuItem
                      testId="dropdown-star"
                      onClick={() => triggerDropdownAction('star')}
                      label={isStarredByMe ? 'Unstar' : 'Star'}
                      icon={
                        <svg fill={isStarredByMe ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className={`w-4 h-4 ${isStarredByMe ? 'text-yellow-400' : ''}`}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      }
                    />

                    {/* Select (enter selection mode) */}
                    <MenuItem
                      testId="dropdown-select"
                      onClick={handleSelectFromDropdown}
                      label="Select"
                      icon={
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      }
                    />

                    {/* Pin / Unpin — admin only */}
                    {isAdmin && (
                      <>
                        <div className="h-px bg-gray-100 my-1" />
                        <MenuItem
                          testId="dropdown-pin"
                          onClick={() => triggerDropdownAction(isPinned ? 'unpin' : 'pin')}
                          label={isPinned ? 'Unpin' : 'Pin'}
                          icon={
                            <svg fill={isPinned ? 'currentColor' : 'none'} viewBox="0 0 20 20" stroke="currentColor" strokeWidth={isPinned ? 0 : 1.5} className={`w-4 h-4 ${isPinned ? 'text-amber-500' : ''}`}>
                              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V4z" clipRule="evenodd" />
                            </svg>
                          }
                        />
                      </>
                    )}

                    {/* Message Info — own messages */}
                    {isMine && (
                      <>
                        <div className="h-px bg-gray-100 my-1" />
                        <MenuItem
                          testId="dropdown-info"
                          onClick={handleMessageInfo}
                          label="Message Info"
                          icon={
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          }
                        />
                      </>
                    )}

                    {/* Delete — own messages */}
                    {isMine && (
                      <>
                        <div className="h-px bg-gray-100 my-1" />
                        <MenuItem
                          testId="dropdown-delete"
                          onClick={() => triggerDropdownAction('delete')}
                          label="Delete"
                          danger
                          icon={
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          }
                        />
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Thread reply count — Phase 27 */}
              {!message.threadId && (message.threadReplyCount ?? 0) > 0 && (
                <button
                  onClick={selectionMode ? undefined : () => onDropdownAction?.('thread', message)}
                  className={`flex items-center gap-1 mt-1 text-xs text-emerald-600 hover:underline ${isMine ? 'justify-end' : 'justify-start'}`}
                  data-testid="thread-reply-count"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {message.threadReplyCount} {message.threadReplyCount === 1 ? 'reply' : 'replies'}
                </button>
              )}

              {/* Reaction pills */}
              {hasReactions && (
                <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`} data-testid="reaction-pills">
                  {Object.entries(reactions).map(([emoji, users]) => (
                    <button
                      key={emoji}
                      onClick={selectionMode ? undefined : () => onReact?.(message.id, emoji)}
                      className={`
                        flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full border shadow-sm transition-all
                        ${currentUsername && (users as string[]).includes(currentUsername)
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-700 font-medium'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }
                      `}
                      aria-label={`React with ${emoji}, ${(users as string[]).length} ${(users as string[]).length === 1 ? 'reaction' : 'reactions'}`}
                      data-testid={`reaction-pill-${emoji}`}
                    >
                      <span>{emoji}</span>
                      <span>{(users as string[]).length}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Emoji reaction button — hover only, not in selection mode */}
            {hovered && !editing && !selectionMode && onReact && (
              <div className={`flex items-center self-end mb-1 ${isMine ? 'mr-1' : 'ml-1'}`}>
                <div className="relative" ref={emojiPickerRef}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker) }}
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
                          className={`text-xl hover:scale-125 transition-transform leading-none p-0.5 rounded ${myReaction === emoji ? 'bg-yellow-100 ring-1 ring-yellow-300' : ''}`}
                          data-testid={`emoji-option-${emoji}`}
                          aria-label={`React with ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(MessageBubble)
