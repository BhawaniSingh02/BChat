import { useState, useRef, useCallback, useEffect } from 'react'
import type { MessageType } from '../../types'
import { uploadApi } from '../../api/upload'

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const MAX_SIZE_MB = 10
const EMOJI_CATEGORIES = [
  { label: 'Smileys', emojis: ['😀','😂','🤣','😊','😍','🥰','😎','🤔','😅','😭','😱','😤','😢','🥺','😏','😜','🤩','😇','🤗','😬'] },
  { label: 'Gestures', emojis: ['👍','👎','👏','🙌','🤝','🙏','💪','✌️','🤞','👋','🤙','💅','👀','🫶','❤️'] },
  { label: 'Objects', emojis: ['🔥','💯','✅','🎉','🎊','💡','⭐','🌟','💎','🚀','🏆','🎯','📌','💬','🔔'] },
]
const COMMON_EMOJIS = EMOJI_CATEGORIES.flatMap((c) => c.emojis)

interface MessageInputProps {
  onSend: (content: string, fileUrl?: string, messageType?: MessageType) => void
  onTyping?: (typing: boolean) => void
  disabled?: boolean
  placeholder?: string
}

interface PendingFile {
  name: string
  preview?: string  // data URL for images
  type: MessageType
}

export default function MessageInput({ onSend, onTyping, disabled, placeholder }: MessageInputProps) {
  const [value, setValue] = useState('')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

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

  const insertEmoji = (emoji: string) => {
    setValue((v) => v + emoji)
    setShowEmojiPicker(false)
  }

  const handleTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true
      onTyping?.(true)
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false
      onTyping?.(false)
    }, 2000)
  }, [onTyping])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    if (e.target.value) handleTyping()
  }

  const handleSend = () => {
    const trimmed = value.trim()
    if ((!trimmed && !pendingFile) || disabled || uploadProgress !== null) return

    if (pendingFile) {
      // File was already uploaded; URL is stored in pendingFile
      onSend(trimmed || pendingFile.name, undefined, undefined)
      // Actually we need the URL — store it differently
      // This path shouldn't happen; file send is handled in handleFileUploadComplete
    }

    if (trimmed) {
      onSend(trimmed)
      setValue('')
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      isTypingRef.current = false
      onTyping?.(false)
    }
  }

  const handleFileUploadComplete = useCallback((url: string, messageType: MessageType, filename: string) => {
    const caption = value.trim()
    onSend(caption || filename, url, messageType)
    setValue('')
    setPendingFile(null)
    setUploadProgress(null)
    setUploadError(null)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    isTypingRef.current = false
    onTyping?.(false)
  }, [value, onSend, onTyping])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!fileInputRef.current) return
    fileInputRef.current.value = ''  // reset so same file can be re-selected
    if (!file) return

    setUploadError(null)

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`File too large. Maximum size is ${MAX_SIZE_MB} MB.`)
      return
    }

    const isImage = file.type.startsWith('image/')
    const messageType: MessageType = isImage ? 'IMAGE' : 'FILE'

    // Show preview for images
    if (isImage) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setPendingFile({ name: file.name, preview: ev.target?.result as string, type: messageType })
      }
      reader.readAsDataURL(file)
    } else {
      setPendingFile({ name: file.name, type: messageType })
    }

    // Upload
    setUploadProgress(0)
    try {
      const result = await uploadApi.uploadFile(file, (pct) => setUploadProgress(pct))
      handleFileUploadComplete(result.url, result.messageType as MessageType, file.name)
    } catch {
      setUploadError('Upload failed. Please try again.')
      setPendingFile(null)
      setUploadProgress(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const cancelPending = () => {
    setPendingFile(null)
    setUploadProgress(null)
    setUploadError(null)
  }

  const isUploading = uploadProgress !== null
  const canSend = (value.trim().length > 0) && !isUploading && !disabled

  return (
    <div className="bg-[#f0f2f5] px-3 py-2.5">
      {/* Upload progress bar */}
      {isUploading && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span className="truncate max-w-[200px]">{pendingFile?.name}</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
              role="progressbar"
              aria-valuenow={uploadProgress ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              data-testid="upload-progress"
            />
          </div>
        </div>
      )}

      {/* Image preview */}
      {pendingFile?.preview && !isUploading && (
        <div className="mb-2 relative inline-block">
          <img
            src={pendingFile.preview}
            alt="Preview"
            className="h-20 rounded-lg object-cover border border-gray-200"
            data-testid="image-preview"
          />
          <button
            onClick={cancelPending}
            className="absolute -top-1.5 -right-1.5 bg-gray-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none"
            aria-label="Cancel upload"
          >
            ×
          </button>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <p className="text-xs text-red-500 mb-2" data-testid="upload-error">{uploadError}</p>
      )}

      <div className="flex items-end gap-2">
        {/* File attach button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-[#54656f] hover:text-[#075e54] hover:bg-gray-100 disabled:opacity-40 flex-shrink-0 transition-colors shadow-sm"
          aria-label="Attach file"
          data-testid="attach-file-btn"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileSelect}
          className="hidden"
          aria-label="File picker"
          data-testid="file-input"
        />

        {/* Emoji picker button */}
        <div className="relative flex-shrink-0" ref={emojiPickerRef}>
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-[#54656f] hover:text-[#075e54] hover:bg-gray-100 disabled:opacity-40 transition-colors shadow-sm"
            aria-label="Insert emoji"
            data-testid="emoji-picker-btn"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          {showEmojiPicker && (
            <div
              className="absolute bottom-12 left-0 p-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-20 w-72 max-h-72 overflow-y-auto"
              data-testid="input-emoji-picker"
            >
              {EMOJI_CATEGORIES.map((cat) => (
                <div key={cat.label} className="mb-1">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1 mb-0.5">{cat.label}</p>
                  <div className="grid grid-cols-5 gap-0.5">
                    {cat.emojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => insertEmoji(emoji)}
                        className="text-xl p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-center"
                        aria-label={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <textarea
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Type a message…'}
          disabled={disabled || isUploading}
          rows={1}
          className="flex-1 resize-none bg-white rounded-3xl px-4 py-2.5 text-sm text-gray-900
            placeholder:text-gray-400 focus:outline-none shadow-sm
            max-h-32 overflow-y-auto disabled:opacity-50"
          style={{ minHeight: '42px' }}
          aria-label="Message input"
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          className="w-10 h-10 bg-[#075e54] hover:bg-[#128c7e] disabled:bg-gray-300 rounded-full
            flex items-center justify-center text-white transition-colors flex-shrink-0 shadow-sm"
          aria-label="Send message"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
