import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface DraftState {
  drafts: Record<string, string>;
  setDraft: (roomId: string, text: string) => void;
  clearDraft: (roomId: string) => void;
}

// Typed-but-unsent text per conversation, restored when reopening it later —
// keyed by the same `roomId` ConversationScreen already receives (raw room id
// for rooms, "dm:<conversationId>" for DMs, so the two never collide).
export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      drafts: {},
      setDraft: (roomId, text) =>
        set((s) => {
          const drafts = { ...s.drafts };
          if (text.trim()) drafts[roomId] = text;
          else delete drafts[roomId];
          return { drafts };
        }),
      clearDraft: (roomId) =>
        set((s) => {
          if (!(roomId in s.drafts)) return s;
          const drafts = { ...s.drafts };
          delete drafts[roomId];
          return { drafts };
        }),
    }),
    { name: 'baaat.drafts', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
