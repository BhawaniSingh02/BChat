import { useState, useMemo, useRef, useEffect } from 'react'
import type { Message } from '../../types'
import { formatTime, formatDate } from '../../utils/date'

interface MessageSearchProps {
  messages: Message[]
  onClose: () => void
  onScrollTo: (messageId: string) => void
}

export default function MessageSearch({ messages, onClose, onScrollTo }: MessageSearchProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return messages
      .filter((m) => !m.deleted && m.content.toLowerCase().includes(q))
      .slice(-50) // last 50 matching
      .reverse() // newest first
  }, [messages, query])

  const highlight = (text: string, q: string) => {
    if (!q) return text
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    )
  }

  return (
    <div
      className="border-b border-gray-200 bg-white"
      data-testid="message-search"
    >
      {/* Search bar */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search in this room…"
          className="flex-1 text-sm outline-none text-gray-900 placeholder-gray-400"
          aria-label="Search messages"
          data-testid="message-search-input"
        />
        {query && (
          <span className="text-xs text-gray-400 flex-shrink-0">
            {results.length} result{results.length !== 1 ? 's' : ''}
          </span>
        )}
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-0.5 rounded hover:bg-gray-100 transition-colors"
          aria-label="Close search"
          data-testid="close-search-btn"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Results */}
      {query.trim() && (
        <div
          className="max-h-64 overflow-y-auto border-t border-gray-100"
          data-testid="search-results"
        >
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No messages match "{query}"
            </div>
          ) : (
            results.map((msg) => (
              <button
                key={msg.id}
                onClick={() => { onScrollTo(msg.id); onClose() }}
                className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                data-testid="search-result-item"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-gray-700">{msg.senderName}</span>
                    <span className="text-xs text-gray-400">{formatDate(msg.timestamp)} {formatTime(msg.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {highlight(msg.content, query.trim())}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
