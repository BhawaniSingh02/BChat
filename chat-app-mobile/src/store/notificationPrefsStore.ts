import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface NotificationPrefsState {
  enabled: boolean;
  sound: boolean;
  setEnabled: (enabled: boolean) => void;
  setSound: (sound: boolean) => void;
}

// Local device preferences — there's no per-user notification-preference model
// on the backend (push registration is all-or-nothing server-side), so "off"
// here means "don't register/keep a push token on this device at all."
export const useNotificationPrefsStore = create<NotificationPrefsState>()(
  persist(
    (set) => ({
      enabled: true,
      sound: true,
      setEnabled: (enabled) => set({ enabled }),
      setSound: (sound) => set({ sound }),
    }),
    { name: 'baaat.notification-prefs', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
