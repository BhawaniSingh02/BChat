import { create } from 'zustand';
import { dmApi } from '../api/dm';
import { useAuthStore } from './authStore';
import { DirectConversation, Message } from '../types';

function sortByLastMessage(conversations: DirectConversation[]): DirectConversation[] {
  return [...conversations].sort((a, b) => {
    const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bt - at;
  });
}

interface DMState {
  conversations: DirectConversation[];
  requests: DirectConversation[];
  unreadCounts: Record<string, number>;
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;
  fetchConversations: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  getOrCreateConversation: (otherUsername: string) => Promise<DirectConversation>;
  acceptRequest: (conversationId: string) => Promise<void>;
  declineRequest: (conversationId: string) => Promise<void>;
  archiveConversation: (conversationId: string) => Promise<void>;
  muteConversation: (conversationId: string, duration?: '8H' | '1W' | 'ALWAYS') => Promise<void>;
  unmuteConversation: (conversationId: string) => Promise<void>;
  fetchUnreadCounts: () => Promise<void>;
  applyIncomingMessage: (message: Message) => void;
  setActiveConversation: (conversationId: string | null) => void;
  clearUnread: (conversationId: string) => void;
  knownConversationIds: () => string[];
}

export const useDMStore = create<DMState>((set, get) => ({
  conversations: [],
  requests: [],
  unreadCounts: {},
  activeConversationId: null,
  isLoading: false,
  error: null,

  fetchConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const conversations = await dmApi.getConversations();
      set({ conversations: sortByLastMessage(conversations), isLoading: false });
    } catch {
      set({ isLoading: false, error: 'Could not load your chats.' });
    }
  },

  fetchRequests: async () => {
    try {
      const requests = await dmApi.getRequests();
      set({ requests });
    } catch {
      // Non-fatal — requests badge just stays stale until next fetch.
    }
  },

  getOrCreateConversation: async (otherUsername) => {
    const conversation = await dmApi.getOrCreate(otherUsername);
    set((s) => ({
      conversations: s.conversations.some((c) => c.id === conversation.id)
        ? s.conversations
        : sortByLastMessage([conversation, ...s.conversations]),
    }));
    return conversation;
  },

  acceptRequest: async (conversationId) => {
    const conversation = await dmApi.acceptRequest(conversationId);
    set((s) => ({
      requests: s.requests.filter((r) => r.id !== conversationId),
      conversations: sortByLastMessage([conversation, ...s.conversations.filter((c) => c.id !== conversationId)]),
    }));
  },

  declineRequest: async (conversationId) => {
    await dmApi.declineRequest(conversationId);
    set((s) => ({ requests: s.requests.filter((r) => r.id !== conversationId) }));
  },

  archiveConversation: async (conversationId) => {
    await dmApi.archive(conversationId);
    set((s) => {
      const { [conversationId]: _removed, ...rest } = s.unreadCounts;
      return {
        conversations: s.conversations.filter((c) => c.id !== conversationId),
        unreadCounts: rest,
      };
    });
  },

  muteConversation: async (conversationId, duration = 'ALWAYS') => {
    const updated = await dmApi.mute(conversationId, duration);
    set((s) => ({ conversations: s.conversations.map((c) => (c.id === conversationId ? updated : c)) }));
  },

  unmuteConversation: async (conversationId) => {
    const updated = await dmApi.unmute(conversationId);
    set((s) => ({ conversations: s.conversations.map((c) => (c.id === conversationId ? updated : c)) }));
  },

  /**
   * Seeds unread counts from the server — needed once after a cold start, since the rest
   * of this store's unread tracking is purely a live tally of socket events received while
   * connected, and would otherwise show 0 for messages that arrived while the app was closed.
   * Fetched counts are applied without clobbering any already-live-tracked value.
   */
  fetchUnreadCounts: async () => {
    try {
      const counts = await dmApi.getUnreadCounts();
      set((s) => ({ unreadCounts: { ...counts, ...s.unreadCounts } }));
    } catch {
      // Non-fatal — live tracking still works from here on.
    }
  },

  applyIncomingMessage: (message) => {
    if (!message.roomId?.startsWith('dm:')) return;
    const conversationId = message.roomId.slice(3);
    const myUsername = useAuthStore.getState().user?.username;
    const isMine = message.sender === myUsername;

    set((s) => {
      const idx = s.conversations.findIndex((c) => c.id === conversationId);
      if (idx === -1) return s;
      const updated = {
        ...s.conversations[idx],
        lastMessageAt: message.timestamp,
        lastMessagePreview: message.deleted ? 'This message was deleted' : message.content,
        lastMessageType: message.messageType,
        lastMessageSender: message.sender,
      };
      const nextConversations = sortByLastMessage([
        updated,
        ...s.conversations.slice(0, idx),
        ...s.conversations.slice(idx + 1),
      ]);

      const shouldCountUnread = !isMine && s.activeConversationId !== conversationId;
      const nextUnread = shouldCountUnread
        ? { ...s.unreadCounts, [conversationId]: (s.unreadCounts[conversationId] ?? 0) + 1 }
        : s.unreadCounts;

      return { conversations: nextConversations, unreadCounts: nextUnread };
    });
  },

  setActiveConversation: (conversationId) => {
    set({ activeConversationId: conversationId });
    if (conversationId) get().clearUnread(conversationId);
  },

  clearUnread: (conversationId) => {
    set((s) => {
      if (!s.unreadCounts[conversationId]) return s;
      const { [conversationId]: _removed, ...rest } = s.unreadCounts;
      return { unreadCounts: rest };
    });
  },

  knownConversationIds: () => {
    const { conversations, requests } = get();
    return [...conversations, ...requests].map((c) => c.id);
  },
}));
