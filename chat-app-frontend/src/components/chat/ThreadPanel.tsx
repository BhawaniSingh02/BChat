import { useCallback, useEffect, useRef, useState } from 'react'
import type { Message } from '../../types'
import { threadsApi } from '../../api/threads'
import { uploadApi } from '../../api/upload'
import MessageBubble from './MessageBubble'
import { formatTime } from '../../utils/date'

interface ThreadPanelProps {
  rootMessage: Message
  currentUsername: string
  onClose: () => void
  onSendReply: (rootMessageId: string, content: string, fileUrl?: string, messageType?: string) => void
}

export default function ThreadPanel({
  rootMessage,
  currentUsername,
  onClose,
  onSendReply,
}: ThreadPanelProps) {
  const [replies, setReplies] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [value, setValue] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadReplies = useCallback(async () => {
    try {
      const data = await threadsApi.getThreadReplies(rootMessage.id)
      setReplies(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [rootMessage.id])

  useEffect(() => {
    loadReplies()
  }, [loadReplies])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [replies])

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || uploading) return
    onSendReply(rootMessage.id, trimmed)
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!fileInputRef.current) return
    fileInputRef.current.value = ''
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadApi.uploadFile(file, () => {})
      onSendReply(rootMessage.id, file.name, result.url, result.messageType)
    } catch {
      // ignore
    } finally {
      setUploading(false)
    }
  }

  return (
    <aside
      className="flex flex-col border-l border-gray-200 bg-white"
      style={{ width: 340, minWidth: 280 }}
      data-testid="thread-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">Thread</h3>
          <p className="text-xs text-gray-400">
            {rootMessage.threadReplyCount ?? replies.length} {(rootMessage.threadReplyCount ?? replies.length) === 1 ? 'reply' : 'replies'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close thread panel"
          data-testid="thread-close-btn"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Root message preview */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
            {rootMessage.senderName?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-700">{rootMessage.senderName}</p>
            <p className="text-sm text-gray-600 break-words line-clamp-3">{rootMessage.content}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{formatTime(rootMessage.timestamp)}</p>
          </div>
        </div>
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : replies.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">No replies yet. Be the first!</p>
        ) : (
          replies.map((reply) => (
            <MessageBubble
              key={reply.id}
              message={reply}
              isMine={reply.sender === currentUsername}
              showSender
              currentUsername={currentUsername}
              isGrouped={false}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            aria-label="Attach file"
            data-testid="thread-attach-btn"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            data-testid="thread-file-input"
          />
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply in thread…"
            rows={1}
            className="flex-1 resize-none bg-gray-100 rounded-2xl px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none max-h-24 overflow-y-auto"
            style={{ minHeight: '36px' }}
            aria-label="Thread reply input"
            data-testid="thread-reply-input"
          />
          <button
            onClick={handleSend}
            disabled={!value.trim() || uploading}
            className="w-8 h-8 bg-[#075e54] hover:bg-[#128c7e] disabled:bg-gray-300 rounded-full flex items-center justify-center text-white transition-colors flex-shrink-0"
            aria-label="Send thread reply"
            data-testid="thread-send-btn"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
