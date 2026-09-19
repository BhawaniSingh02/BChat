import { create } from 'zustand';
import { dmApi } from '../api/dm';
import { roomsApi } from '../api/rooms';
import { Message } from '../types';

interface ChatState {
  messagesByRoom: Record<string, Message[]>;
  nextCursor: Record<string, number | null>;
  hasMore: Record<string, boolean>;
  isLoading: Record<string, boolean>;
  typingUsers: Record<string, string[]>;
  fetchMessages: (roomId: string) => Promise<void>;
  loadMore: (roomId: string) => Promise<void>;
  fetchDMMessages: (conversationId: string) => Promise<void>;
  loadMoreDM: (conversationId: string) => Promise<void>;
  upsertMessage: (message: Message) => void;
  markMessageFailed: (roomId: string, clientId: string) => void;
  setTyping: (key: string, username: string, typing: boolean) => void;
}

// Safety net: if a "stopped typing" event never arrives (app killed, connection
// drop mid-type), auto-clear the indicator after a few seconds of silence rather
// than leaving it stuck forever. Keyed by `${key}:${username}`, module-scoped
// since it's just a timer handle, not state anything needs to render from.
const typingTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const TYPING_STALE_MS = 6000;

export const useChatStore = create<ChatState>((set, get) => ({
  messagesByRoom: {},
  nextCursor: {},
  hasMore: {},
  isLoading: {},
  typingUsers: {},

  fetchMessages: async (roomId) => {
    set((s) => ({ isLoading: { ...s.isLoading, [roomId]: true } }));
    try {
      const page = await roomsApi.getMessages(roomId);
      const ordered = [...page.content].reverse();
      set((s) => ({
        messagesByRoom: { ...s.messagesByRoom, [roomId]: ordered },
        nextCursor: { ...s.nextCursor, [roomId]: page.nextCursor },
        hasMore: { ...s.hasMore, [roomId]: page.hasMore },
        isLoading: { ...s.isLoading, [roomId]: false },
      }));
    } catch {
      set((s) => ({ isLoading: { ...s.isLoading, [roomId]: false } }));
    }
  },

  loadMore: async (roomId) => {
    const { nextCursor, hasMore } = get();
    const cursor = nextCursor[roomId];
    if (!hasMore[roomId] || cursor == null) return;
    const page = await roomsApi.getMessages(roomId, cursor);
    const older = [...page.content].reverse();
    set((s) => ({
      messagesByRoom: { ...s.messagesByRoom, [roomId]: [...older, ...(s.messagesByRoom[roomId] ?? [])] },
      nextCursor: { ...s.nextCursor, [roomId]: page.nextCursor },
      hasMore: { ...s.hasMore, [roomId]: page.hasMore },
    }));
  },

  fetchDMMessages: async (conversationId) => {
    const key = `dm:${conversationId}`;
    set((s) => ({ isLoading: { ...s.isLoading, [key]: true } }));
    try {
      const page = await dmApi.getMessages(conversationId);
      const ordered = [...page.content].reverse();
      set((s) => ({
        messagesByRoom: { ...s.messagesByRoom, [key]: ordered },
        nextCursor: { ...s.nextCursor, [key]: page.nextCursor },
        hasMore: { ...s.hasMore, [key]: page.hasMore },
        isLoading: { ...s.isLoading, [key]: false },
      }));
    } catch {
      set((s) => ({ isLoading: { ...s.isLoading, [key]: false } }));
    }
  },

  loadMoreDM: async (conversationId) => {
    const key = `dm:${conversationId}`;
    const { nextCursor, hasMore } = get();
    const cursor = nextCursor[key];
    if (!hasMore[key] || cursor == null) return;
    const page = await dmApi.getMessages(conversationId, cursor);
    const older = [...page.content].reverse();
    set((s) => ({
      messagesByRoom: { ...s.messagesByRoom, [key]: [...older, ...(s.messagesByRoom[key] ?? [])] },
      nextCursor: { ...s.nextCursor, [key]: page.nextCursor },
      hasMore: { ...s.hasMore, [key]: page.hasMore },
    }));
  },

  upsertMessage: (message) => {
    set((s) => {
      const existing = s.messagesByRoom[message.roomId] ?? [];
      // Reconcile an optimistically-sent message: its local placeholder was inserted with
      // id === clientId, so the server echo (which has a real id but the same clientId)
      // needs to replace that placeholder in place rather than being appended as a new row.
      if (message.clientId) {
        const placeholderIdx = existing.findIndex((m) => m.id === message.clientId);
        if (placeholderIdx >= 0) {
          const reconciled = existing.map((m, i) => (i === placeholderIdx ? { ...message, status: 'sent' as const } : m));
          return { messagesByRoom: { ...s.messagesByRoom, [message.roomId]: reconciled } };
        }
      }
      const idx = existing.findIndex((m) => m.id === message.id);
      const updated =
        idx >= 0 ? existing.map((m, i) => (i === idx ? message : m)) : [...existing, message];
      return { messagesByRoom: { ...s.messagesByRoom, [message.roomId]: updated } };
    });
  },

  markMessageFailed: (roomId, clientId) => {
    set((s) => {
      const existing = s.messagesByRoom[roomId] ?? [];
      const idx = existing.findIndex((m) => m.id === clientId && m.status === 'sending');
      if (idx === -1) return s;
      const updated = existing.map((m, i) => (i === idx ? { ...m, status: 'failed' as const } : m));
      return { messagesByRoom: { ...s.messagesByRoom, [roomId]: updated } };
    });
  },

  setTyping: (key, username, typing) => {
    const timerKey = `${key}:${username}`;
    clearTimeout(typingTimers[timerKey]);
    delete typingTimers[timerKey];

    set((s) => {
      const current = s.typingUsers[key] ?? [];
      const next = typing
        ? current.includes(username)
          ? current
          : [...current, username]
        : current.filter((u) => u !== username);
      if (next === current) return s;
      return { typingUsers: { ...s.typingUsers, [key]: next } };
    });

    if (typing) {
      typingTimers[timerKey] = setTimeout(() => {
        delete typingTimers[timerKey];
        get().setTyping(key, username, false);
      }, TYPING_STALE_MS);
    }
  },
}));
