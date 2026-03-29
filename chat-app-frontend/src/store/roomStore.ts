import { create } from 'zustand'
import type { Room, UpdateRoomRequest } from '../types'
import { roomsApi } from '../api/rooms'

interface RoomState {
  rooms: Room[]
  myRooms: Room[]
  activeRoomId: string | null
  isLoading: boolean
  fetchAllRooms: () => Promise<void>
  fetchMyRooms: () => Promise<void>
  setActiveRoom: (roomId: string | null) => void
  createRoom: (roomId: string, name: string, description?: string) => Promise<Room>
  joinRoom: (roomId: string) => Promise<void>
  leaveRoom: (roomId: string) => Promise<void>
  updateRoomLastMessage: (roomId: string, timestamp: string) => void
  kickMember: (roomId: string, username: string) => Promise<void>
  updateRoom: (roomId: string, data: UpdateRoomRequest) => Promise<Room>
  pinMessage: (roomId: string, messageId: string) => Promise<void>
  unpinMessage: (roomId: string, messageId: string) => Promise<void>
}

export const useRoomStore = create<RoomState>((set) => ({
  rooms: [],
  myRooms: [],
  activeRoomId: null,
  isLoading: false,

  fetchAllRooms: async () => {
    set({ isLoading: true })
    const rooms = await roomsApi.getAll()
    set({ rooms, isLoading: false })
  },

  fetchMyRooms: async () => {
    const myRooms = await roomsApi.getMine()
    set({ myRooms })
  },

  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),

  createRoom: async (roomId, name, description) => {
    const room = await roomsApi.create({ roomId, name, description })
    set((s) => ({ myRooms: [room, ...s.myRooms], rooms: [room, ...s.rooms] }))
    return room
  },

  joinRoom: async (roomId) => {
    const room = await roomsApi.join(roomId)
    set((s) => ({
      myRooms: s.myRooms.some((r) => r.roomId === roomId)
        ? s.myRooms
        : [room, ...s.myRooms],
    }))
  },

  leaveRoom: async (roomId) => {
    await roomsApi.leave(roomId)
    set((s) => ({
      myRooms: s.myRooms.filter((r) => r.roomId !== roomId),
      activeRoomId: s.activeRoomId === roomId ? null : s.activeRoomId,
    }))
  },

  updateRoomLastMessage: (roomId, timestamp) => {
    const update = (rooms: Room[]) =>
      rooms.map((r) => (r.roomId === roomId ? { ...r, lastMessageAt: timestamp } : r))
    set((s) => ({ rooms: update(s.rooms), myRooms: update(s.myRooms) }))
  },

  kickMember: async (roomId, username) => {
    const updated = await roomsApi.kickMember(roomId, username)
    const applyUpdate = (rooms: Room[]) => rooms.map((r) => r.roomId === roomId ? updated : r)
    set((s) => ({ myRooms: applyUpdate(s.myRooms), rooms: applyUpdate(s.rooms) }))
  },

  updateRoom: async (roomId, data) => {
    const updated = await roomsApi.updateRoom(roomId, data)
    const applyUpdate = (rooms: Room[]) => rooms.map((r) => r.roomId === roomId ? updated : r)
    set((s) => ({ myRooms: applyUpdate(s.myRooms), rooms: applyUpdate(s.rooms) }))
    return updated
  },

  pinMessage: async (roomId, messageId) => {
    const updated = await roomsApi.pinMessage(roomId, messageId)
    const applyUpdate = (rooms: Room[]) => rooms.map((r) => r.roomId === roomId ? updated : r)
    set((s) => ({ myRooms: applyUpdate(s.myRooms), rooms: applyUpdate(s.rooms) }))
  },

  unpinMessage: async (roomId, messageId) => {
    const updated = await roomsApi.unpinMessage(roomId, messageId)
    const applyUpdate = (rooms: Room[]) => rooms.map((r) => r.roomId === roomId ? updated : r)
    set((s) => ({ myRooms: applyUpdate(s.myRooms), rooms: applyUpdate(s.rooms) }))
  },
}))
