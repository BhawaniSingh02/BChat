import { useState, useEffect, useRef, useCallback } from 'react'
import type { Room, DirectConversation } from '../../types'
import Avatar from './Avatar'
import { usePresenceStore } from '../../store/presenceStore'

interface QuickSwitcherProps {
  open: boolean
  onClose: () => void
  rooms: Room[]
  conversations: DirectConversation[]
  currentUsername: string
  onSelectRoom: (roomId: string) => void
  onSelectDM: (conversationId: string) => void
  activeRoomId: string | null
  activeDMId: string | null
}

interface SwitcherItem {
  type: 'room' | 'dm'
  id: string
  name: string
  subtitle: string
  online?: boolean
}

export default function QuickSwitcher({
  open,
  onClose,
  rooms,
  conversations,
  currentUsername,
  onSelectRoom,
  onSelectDM,
  activeRoomId,
  activeDMId,
}: QuickSwitcherProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const isOnline = usePresenceStore((s) => s.isOnline)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const allItems: SwitcherItem[] = [
    ...rooms.map((r) => ({
      type: 'room' as const,
      id: r.roomId,
      name: r.name,
      subtitle: `${r.memberCount} members`,
    })),
    ...conversations.map((c) => {
      const other = c.participants.find((p) => p !== currentUsername) ?? '?'
      return {
        type: 'dm' as const,
        id: c.id,
        name: other,
        subtitle: isOnline(other) ? 'Online' : 'Offline',
        online: isOnline(other),
      }
    }),
  ]

  const filtered = query.trim()
    ? allItems.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      )
    : allItems

  const handleSelect = useCallback((item: SwitcherItem) => {
    if (item.type === 'room') {
      onSelectRoom(item.id)
    } else {
      onSelectDM(item.id)
    }
    onClose()
  }, [onSelectRoom, onSelectDM, onClose])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (!open) return
    const down = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[selectedIndex]) handleSelect(filtered[selectedIndex])
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, filtered, selectedIndex, handleSelect, onClose])

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!open) return null

  const isActive = (item: SwitcherItem) =>
    item.type === 'room' ? item.id === activeRoomId : item.id === activeDMId

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      data-testid="quick-switcher"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        data-testid="quick-switcher-backdrop"
      />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-gray-200">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to room or conversation…"
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
            aria-label="Quick switch search"
            data-testid="quick-switcher-input"
          />
          <kbd className="hidden sm:flex items-center gap-0.5 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded font-mono">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2" data-testid="quick-switcher-results">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No results for "{query}"
            </div>
          ) : (
            <>
              {/* Group by type if no query */}
              {!query.trim() && rooms.length > 0 && (
                <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Rooms</p>
              )}
              {filtered.filter(i => i.type === 'room').map((item) => {
                const absoluteIdx = filtered.indexOf(item)
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      absoluteIdx === selectedIndex
                        ? 'bg-emerald-50'
                        : 'hover:bg-gray-50'
                    }`}
                    data-testid="quick-switcher-item"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">#</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive(item) ? 'text-emerald-600' : 'text-gray-900'}`}>
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>
                    </div>
                    {isActive(item) && (
                      <span className="text-xs text-emerald-500 font-medium flex-shrink-0">Current</span>
                    )}
                  </button>
                )
              })}

              {!query.trim() && conversations.length > 0 && (
                <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">Direct Messages</p>
              )}
              {filtered.filter(i => i.type === 'dm').map((item) => {
                const absoluteIdx = filtered.indexOf(item)
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      absoluteIdx === selectedIndex
                        ? 'bg-emerald-50'
                        : 'hover:bg-gray-50'
                    }`}
                    data-testid="quick-switcher-item"
                  >
                    <Avatar name={item.name} size="sm" online={item.online} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive(item) ? 'text-emerald-600' : 'text-gray-900'}`}>
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>
                    </div>
                    {isActive(item) && (
                      <span className="text-xs text-emerald-500 font-medium flex-shrink-0">Current</span>
                    )}
                  </button>
                )
              })}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">↵</kbd> select</span>
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
