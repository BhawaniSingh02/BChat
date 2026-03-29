import { useState } from 'react'
import type { Room } from '../../types'
import RoomCard from './RoomCard'
import CreateRoomModal from './CreateRoomModal'
import Button from '../ui/Button'

interface RoomListProps {
  rooms: Room[]
  activeRoomId: string | null
  onSelectRoom: (roomId: string) => void
  onJoinRoom?: (roomId: string) => void
  showJoin?: boolean
  unreadCounts?: Record<string, number>
}

export default function RoomList({ rooms, activeRoomId, onSelectRoom, onJoinRoom, showJoin, unreadCounts }: RoomListProps) {
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.roomId.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search rooms…"
          className="w-full bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          aria-label="Search rooms"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">
            {search ? 'No rooms match your search' : 'No rooms yet'}
          </div>
        ) : (
          filtered.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              active={room.roomId === activeRoomId}
              unreadCount={unreadCounts?.[room.roomId]}
              onClick={() => showJoin ? onJoinRoom?.(room.roomId) : onSelectRoom(room.roomId)}
            />
          ))
        )}
      </div>

      {!showJoin && (
        <div className="p-4 border-t">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setCreateOpen(true)}
          >
            + New Room
          </Button>
        </div>
      )}

      <CreateRoomModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
