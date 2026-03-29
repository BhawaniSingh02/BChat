import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useRoomStore } from '../../store/roomStore'
import { roomsApi } from '../../api/rooms'
import type { Room } from '../../types'

vi.mock('../../api/rooms')

const makeRoom = (roomId: string, createdBy = 'alice'): Room => ({
  id: `id-${roomId}`,
  roomId,
  name: `Room ${roomId}`,
  description: 'Test room',
  createdBy,
  members: ['alice', 'bob'],
  pinnedMessages: [],
  memberCount: 2,
  createdAt: '2026-03-28T10:00:00',
})

describe('roomStore', () => {
  beforeEach(() => {
    useRoomStore.setState({ rooms: [], myRooms: [], activeRoomId: null, isLoading: false })
    vi.clearAllMocks()
  })

  describe('fetchAllRooms', () => {
    it('fetches and stores all rooms', async () => {
      vi.mocked(roomsApi.getAll).mockResolvedValue([makeRoom('general')])
      await useRoomStore.getState().fetchAllRooms()
      expect(useRoomStore.getState().rooms).toHaveLength(1)
      expect(useRoomStore.getState().isLoading).toBe(false)
    })
  })

  describe('fetchMyRooms', () => {
    it('fetches and stores user rooms', async () => {
      vi.mocked(roomsApi.getMine).mockResolvedValue([makeRoom('my-room')])
      await useRoomStore.getState().fetchMyRooms()
      expect(useRoomStore.getState().myRooms).toHaveLength(1)
    })
  })

  describe('setActiveRoom', () => {
    it('sets the active room ID', () => {
      useRoomStore.getState().setActiveRoom('general')
      expect(useRoomStore.getState().activeRoomId).toBe('general')
    })

    it('can clear the active room', () => {
      useRoomStore.setState({ activeRoomId: 'general' })
      useRoomStore.getState().setActiveRoom(null)
      expect(useRoomStore.getState().activeRoomId).toBeNull()
    })
  })

  describe('createRoom', () => {
    it('creates room and adds to both lists', async () => {
      const room = makeRoom('new-room')
      vi.mocked(roomsApi.create).mockResolvedValue(room)
      await useRoomStore.getState().createRoom('new-room', 'New Room')
      expect(useRoomStore.getState().myRooms).toHaveLength(1)
      expect(useRoomStore.getState().rooms).toHaveLength(1)
    })

    it('returns the created room', async () => {
      const room = makeRoom('new-room')
      vi.mocked(roomsApi.create).mockResolvedValue(room)
      const result = await useRoomStore.getState().createRoom('new-room', 'New Room')
      expect(result.roomId).toBe('new-room')
    })
  })

  describe('joinRoom', () => {
    it('adds room to myRooms if not already present', async () => {
      const room = makeRoom('general')
      vi.mocked(roomsApi.join).mockResolvedValue(room)
      await useRoomStore.getState().joinRoom('general')
      expect(useRoomStore.getState().myRooms).toHaveLength(1)
    })

    it('does not duplicate room in myRooms', async () => {
      const room = makeRoom('general')
      useRoomStore.setState({ myRooms: [room] })
      vi.mocked(roomsApi.join).mockResolvedValue(room)
      await useRoomStore.getState().joinRoom('general')
      expect(useRoomStore.getState().myRooms).toHaveLength(1)
    })
  })

  describe('leaveRoom', () => {
    it('removes room from myRooms', async () => {
      useRoomStore.setState({ myRooms: [makeRoom('general')] })
      vi.mocked(roomsApi.leave).mockResolvedValue(undefined as any)
      await useRoomStore.getState().leaveRoom('general')
      expect(useRoomStore.getState().myRooms).toHaveLength(0)
    })

    it('clears activeRoomId when leaving active room', async () => {
      useRoomStore.setState({ myRooms: [makeRoom('general')], activeRoomId: 'general' })
      vi.mocked(roomsApi.leave).mockResolvedValue(undefined as any)
      await useRoomStore.getState().leaveRoom('general')
      expect(useRoomStore.getState().activeRoomId).toBeNull()
    })
  })

  describe('updateRoomLastMessage', () => {
    it('updates lastMessageAt on matching rooms', () => {
      const room = makeRoom('general')
      useRoomStore.setState({ myRooms: [room], rooms: [room] })
      useRoomStore.getState().updateRoomLastMessage('general', '2026-03-29T12:00:00')
      expect(useRoomStore.getState().myRooms[0].lastMessageAt).toBe('2026-03-29T12:00:00')
      expect(useRoomStore.getState().rooms[0].lastMessageAt).toBe('2026-03-29T12:00:00')
    })
  })

  describe('kickMember', () => {
    it('updates the room after kick', async () => {
      const room = makeRoom('general')
      const updatedRoom = { ...room, members: ['alice'], memberCount: 1 }
      useRoomStore.setState({ myRooms: [room], rooms: [room] })
      vi.mocked(roomsApi.kickMember).mockResolvedValue(updatedRoom)
      await useRoomStore.getState().kickMember('general', 'bob')
      expect(useRoomStore.getState().myRooms[0].memberCount).toBe(1)
      expect(useRoomStore.getState().rooms[0].memberCount).toBe(1)
    })

    it('calls kickMember API with correct args', async () => {
      const room = makeRoom('general')
      useRoomStore.setState({ myRooms: [room], rooms: [room] })
      vi.mocked(roomsApi.kickMember).mockResolvedValue(room)
      await useRoomStore.getState().kickMember('general', 'bob')
      expect(roomsApi.kickMember).toHaveBeenCalledWith('general', 'bob')
    })
  })

  describe('updateRoom', () => {
    it('updates room name in both lists', async () => {
      const room = makeRoom('general')
      const updatedRoom = { ...room, name: 'Updated Name' }
      useRoomStore.setState({ myRooms: [room], rooms: [room] })
      vi.mocked(roomsApi.updateRoom).mockResolvedValue(updatedRoom)
      await useRoomStore.getState().updateRoom('general', { name: 'Updated Name' })
      expect(useRoomStore.getState().myRooms[0].name).toBe('Updated Name')
      expect(useRoomStore.getState().rooms[0].name).toBe('Updated Name')
    })

    it('returns the updated room', async () => {
      const room = makeRoom('general')
      const updatedRoom = { ...room, name: 'New Name' }
      useRoomStore.setState({ myRooms: [room], rooms: [room] })
      vi.mocked(roomsApi.updateRoom).mockResolvedValue(updatedRoom)
      const result = await useRoomStore.getState().updateRoom('general', { name: 'New Name' })
      expect(result.name).toBe('New Name')
    })
  })

  describe('pinMessage', () => {
    it('updates pinnedMessages in the store', async () => {
      const room = makeRoom('general')
      const pinned = { ...room, pinnedMessages: ['msg-1'] }
      useRoomStore.setState({ myRooms: [room], rooms: [room] })
      vi.mocked(roomsApi.pinMessage).mockResolvedValue(pinned)
      await useRoomStore.getState().pinMessage('general', 'msg-1')
      expect(useRoomStore.getState().myRooms[0].pinnedMessages).toContain('msg-1')
    })

    it('calls pinMessage API with correct args', async () => {
      const room = makeRoom('general')
      useRoomStore.setState({ myRooms: [room], rooms: [room] })
      vi.mocked(roomsApi.pinMessage).mockResolvedValue(room)
      await useRoomStore.getState().pinMessage('general', 'msg-1')
      expect(roomsApi.pinMessage).toHaveBeenCalledWith('general', 'msg-1')
    })
  })

  describe('unpinMessage', () => {
    it('removes message from pinnedMessages in the store', async () => {
      const room = { ...makeRoom('general'), pinnedMessages: ['msg-1'] }
      const unpinned = { ...room, pinnedMessages: [] }
      useRoomStore.setState({ myRooms: [room], rooms: [room] })
      vi.mocked(roomsApi.unpinMessage).mockResolvedValue(unpinned)
      await useRoomStore.getState().unpinMessage('general', 'msg-1')
      expect(useRoomStore.getState().myRooms[0].pinnedMessages).toHaveLength(0)
    })
  })
})
