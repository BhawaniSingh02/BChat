import { useState, useCallback } from 'react'
import Modal from './Modal'
import Avatar from './Avatar'
import { usersApi } from '../../api/users'
import type { User } from '../../types'
import { usePresenceStore } from '../../store/presenceStore'

interface UserSearchModalProps {
  open: boolean
  onClose: () => void
  onSelectUser: (username: string) => void
  currentUsername: string
}

export default function UserSearchModal({
  open,
  onClose,
  onSelectUser,
  currentUsername,
}: UserSearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const isOnline = usePresenceStore((s) => s.isOnline)

  const search = useCallback(async (q: string) => {
    setQuery(q)
    if (!q.trim()) { setResults([]); return }
    setIsSearching(true)
    try {
      const users = await usersApi.search(q)
      setResults(users.filter((u) => u.username !== currentUsername))
    } finally {
      setIsSearching(false)
    }
  }, [currentUsername])

  const handleSelect = (username: string) => {
    onSelectUser(username)
    onClose()
    setQuery('')
    setResults([])
  }

  return (
    <Modal open={open} onClose={onClose} title="New Direct Message">
      <div className="space-y-3">
        <input
          type="text"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Search users by username…"
          className="w-full bg-gray-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          autoFocus
          aria-label="Search users"
        />

        <div className="min-h-32 max-h-64 overflow-y-auto">
          {isSearching && (
            <p className="text-center text-sm text-gray-400 py-4">Searching…</p>
          )}
          {!isSearching && query && results.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-4">No users found</p>
          )}
          {!isSearching && !query && (
            <p className="text-center text-sm text-gray-400 py-4">Type a username to search</p>
          )}
          {results.map((user) => (
            <button
              key={user.id}
              className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
              onClick={() => handleSelect(user.username)}
              data-testid="user-search-result"
            >
              <Avatar name={user.username} size="sm" online={isOnline(user.username)} />
              <div>
                <p className="text-sm font-medium text-gray-900">{user.username}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
