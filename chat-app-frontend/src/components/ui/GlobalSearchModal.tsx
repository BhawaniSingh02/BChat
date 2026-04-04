import { useCallback, useEffect, useRef, useState } from 'react'
import type { Message } from '../../types'
import { searchApi } from '../../api/search'
import { formatTime } from '../../utils/date'

interface SearchResult extends Message {
  _roomLabel?: string
}

interface GlobalSearchModalProps {
  open: boolean
  onClose: () => void
  /** Called when user clicks a result to navigate to it */
  onNavigate: (message: Message) => void
  currentUsername: string
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

function getRoomLabel(roomId: string): string {
  if (roomId.startsWith('dm:')) return 'Direct Message'
  return `#${roomId}`
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function GlobalSearchModal({ open, onClose, onNavigate, currentUsername }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 350)

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setError(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Search when debounced query changes
  useEffect(() => {
    if (!open || debouncedQuery.trim().length < 2) {
      setResults([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    searchApi.searchMessages(debouncedQuery.trim(), 30)
      .then((data) => {
        if (!cancelled) setResults(data)
      })
      .catch(() => {
        if (!cancelled) setError('Search failed. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [open, debouncedQuery])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  if (!open) return null

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, msg) => {
    const key = msg.roomId
    if (!acc[key]) acc[key] = []
    acc[key].push(msg)
    return acc
  }, {})

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Search messages"
      data-testid="global-search-modal"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        data-testid="search-backdrop"
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[70vh] flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages…"
            className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none bg-transparent"
            aria-label="Search messages"
            data-testid="global-search-input"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" aria-label="Searching" />
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close search"
            data-testid="search-close-btn"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <p className="text-center text-sm text-red-500 py-6" data-testid="search-error">{error}</p>
          )}

          {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8" data-testid="search-no-results">
              No results for &ldquo;<strong>{query}</strong>&rdquo;
            </p>
          )}

          {!error && results.length > 0 && (
            <div className="py-2">
              {Object.entries(grouped).map(([roomId, messages]) => (
                <div key={roomId} className="mb-2">
                  <div className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider sticky top-0 bg-white/95 backdrop-blur-sm">
                    {getRoomLabel(roomId)}
                  </div>
                  {messages.map((msg) => (
                    <button
                      key={msg.id}
                      onClick={() => { onNavigate(msg); onClose() }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex flex-col gap-0.5"
                      data-testid="search-result-item"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-emerald-700">{msg.senderName}</span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTime(msg.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2 break-words">
                        {highlightMatch(msg.content, query)}
                      </p>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {query.trim().length < 2 && query.length > 0 && (
            <p className="text-center text-sm text-gray-400 py-8">
              Type at least 2 characters to search
            </p>
          )}

          {query.length === 0 && (
            <div className="py-8 px-4 text-center">
              <p className="text-sm text-gray-400">Search across all your conversations</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
