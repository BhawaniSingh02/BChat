import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import apiClient from '../api/client';
import { useNotificationPrefsStore } from '../store/notificationPrefsStore';

const MESSAGE_CHANNEL_ID = 'messages';

// Cached so signOut() can unregister the exact token that was registered,
// without needing to re-request one from Expo/FCM during logout.
let cachedPushToken: string | null = null;

/** Test-only: clears the session cache between tests. */
export function resetPushTokenCache(): void {
  cachedPushToken = null;
}

/** Which conversation/room the user is currently looking at — set by ConversationScreen. Mirrors WhatsApp: no banner/sound for the chat you already have open. */
let activeConversationKey: string | null = null;
export function setActiveConversationKey(key: string | null): void {
  activeConversationKey = key;
}

export function notificationDataKey(data: { roomId?: string; conversationId?: string }): string | null {
  if (data.roomId) return `room:${data.roomId}`;
  if (data.conversationId) return `dm:${data.conversationId}`;
  return null;
}

/** Exported directly so it's unit-testable without going through expo-notifications' handler plumbing. */
export function computeNotificationBehavior(data: { roomId?: string; conversationId?: string }) {
  const isForActiveChat = notificationDataKey(data) === activeConversationKey && notificationDataKey(data) !== null;
  return {
    shouldShowBanner: !isForActiveChat,
    shouldShowList: !isForActiveChat,
    shouldPlaySound: !isForActiveChat && useNotificationPrefsStore.getState().sound,
    shouldSetBadge: true,
  };
}

/** Call once, on app startup (see App.tsx) — not at module load time, so this file stays side-effect-free to import (and testable) on its own. */
export function initNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) =>
      computeNotificationBehavior(notification.request.content.data as { roomId?: string; conversationId?: string }),
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(MESSAGE_CHANNEL_ID, {
    name: 'Messages',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'message_chime.wav',
    vibrationPattern: [0, 150, 100, 150],
  });
}

/**
 * Requests permission, registers the device's Expo push token with the
 * backend, and sets up the Android notification channel carrying Baaat's
 * signature chime. No-ops on simulators (push doesn't work there) or if no
 * EAS project is configured yet (`expo-constants`'s `extra.eas.projectId` is
 * only populated after `eas init`).
 */
export async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) return;
  if (!useNotificationPrefsStore.getState().enabled) return;

  await ensureAndroidChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn('[push] No EAS project configured yet (run `eas init`) — skipping push token registration.');
    return;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    cachedPushToken = token;
    await apiClient.post('/push/mobile/register', { expoPushToken: token, platform: Platform.OS });
  } catch (err) {
    console.warn('[push] Failed to register push token', err);
  }
}

/**
 * Unregisters this device's push token on logout — otherwise a stale token
 * for the signed-out account keeps receiving notifications on this device
 * (e.g. if someone else signs into a different account afterwards).
 */
export async function unregisterPushNotifications(): Promise<void> {
  if (!cachedPushToken) return;
  const token = cachedPushToken;
  cachedPushToken = null;
  try {
    await apiClient.delete('/push/mobile/register', { data: { expoPushToken: token } });
  } catch {
    // Non-fatal — the token will naturally get pruned server-side once it's dead/stale.
  }
}

/**
 * Handles the case where the app was fully closed and got launched by tapping
 * a notification — addNotificationResponseReceivedListener only fires for taps
 * that happen while the JS runtime is already alive. Call once after the
 * navigator mounts; returns the tap data if that's how the app was opened.
 */
export async function getColdStartNotificationData(): Promise<{ roomId?: string; conversationId?: string } | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return null;
  return response.notification.request.content.data as { roomId?: string; conversationId?: string };
}
