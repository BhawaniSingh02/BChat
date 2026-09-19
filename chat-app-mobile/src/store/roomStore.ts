import { create } from 'zustand';
import { roomsApi } from '../api/rooms';
import { useAuthStore } from './authStore';
import { Room, RoomEvent } from '../types';

export function muteUntilFor(duration: '8H' | '1W' | 'ALWAYS'): string {
  switch (duration) {
    case '8H':
      return new Date(Date.now() + 8 * 3600 * 1000).toISOString();
    case '1W':
      return new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    default:
      return '9999-12-31T23:59:59.000Z';
  }
}

interface RoomState {
  myRooms: Room[];
  unreadCounts: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  fetchMyRooms: () => Promise<void>;
  fetchUnreadCounts: () => Promise<void>;
  clearUnread: (roomId: string) => void;
  touchRoom: (roomId: string, timestamp: string) => void;
  applyRoomUpdate: (room: Room) => void;
  removeRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => Promise<void>;
  createRoom: (roomId: string, name: string, description?: string) => Promise<Room>;
  muteRoom: (roomId: string, duration?: '8H' | '1W' | 'ALWAYS') => Promise<void>;
  unmuteRoom: (roomId: string) => Promise<void>;
  applyRoomEvent: (event: RoomEvent) => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  myRooms: [],
  unreadCounts: {},
  isLoading: false,
  error: null,

  fetchMyRooms: async () => {
    set({ isLoading: true, error: null });
    try {
      const rooms = await roomsApi.getMine();
      set({ myRooms: rooms, isLoading: false });
    } catch {
      set({ isLoading: false, error: 'Could not load your chats.' });
    }
  },

  /** Always-fresh (uncached) unread counts — fetched separately from the room list itself. */
  fetchUnreadCounts: async () => {
    try {
      const counts = await roomsApi.getUnreadCounts();
      set({ unreadCounts: counts });
    } catch {
      // Non-fatal — badges just stay stale until the next fetch.
    }
  },

  clearUnread: (roomId) => {
    set((state) => {
      if (!state.unreadCounts[roomId]) return state;
      const { [roomId]: _removed, ...rest } = state.unreadCounts;
      return { unreadCounts: rest };
    });
  },

  touchRoom: (roomId, timestamp) => {
    set((state) => ({
      myRooms: state.myRooms.map((r) => (r.roomId === roomId ? { ...r, lastMessageAt: timestamp } : r)),
    }));
  },

  /** Patches a single room in-place (e.g. after pin/unpin returns the updated room). */
  applyRoomUpdate: (room) => {
    set((state) => ({
      myRooms: state.myRooms.map((r) => (r.roomId === room.roomId ? room : r)),
    }));
  },

  removeRoom: (roomId) => {
    set((state) => {
      const { [roomId]: _removed, ...rest } = state.unreadCounts;
      return { myRooms: state.myRooms.filter((r) => r.roomId !== roomId), unreadCounts: rest };
    });
  },

  leaveRoom: async (roomId) => {
    await roomsApi.leave(roomId);
    get().removeRoom(roomId);
  },

  createRoom: async (roomId, name, description) => {
    const room = await roomsApi.create({ roomId, name, description });
    set((state) => ({ myRooms: [room, ...state.myRooms] }));
    return room;
  },

  muteRoom: async (roomId, duration = 'ALWAYS') => {
    await roomsApi.mute(roomId, duration);
    const username = useAuthStore.getState().user?.username;
    if (!username) return;
    set((state) => ({
      myRooms: state.myRooms.map((r) =>
        r.roomId === roomId ? { ...r, mutedBy: { ...r.mutedBy, [username]: muteUntilFor(duration) } } : r,
      ),
    }));
  },

  unmuteRoom: async (roomId) => {
    await roomsApi.unmute(roomId);
    const username = useAuthStore.getState().user?.username;
    if (!username) return;
    set((state) => ({
      myRooms: state.myRooms.map((r) => {
        if (r.roomId !== roomId || !r.mutedBy) return r;
        const { [username]: _removed, ...rest } = r.mutedBy;
        return { ...r, mutedBy: rest };
      }),
    }));
  },

  /** Reacts to a live push (kick/leave/join/edit) for a room, regardless of which screen is open. */
  applyRoomEvent: (event) => {
    if (event.eventType === 'MEMBER_REMOVED' && !event.room) {
      // This is about the current user having just been kicked — they're no longer a
      // member, so there's no updated room object to apply, just remove it from the list.
      get().removeRoom(event.roomId);
      return;
    }
    if (event.room) get().applyRoomUpdate(event.room);
  },
}));
