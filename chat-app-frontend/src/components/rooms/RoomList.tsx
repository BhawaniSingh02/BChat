import { useState } from 'react'
import type { Room } from '../../types'
import RoomCard from './RoomCard'

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

  const filtered = rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.roomId.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search rooms…"
          className="w-full bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-[#2a3942] dark:text-gray-100"
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
    </div>
  )
}
