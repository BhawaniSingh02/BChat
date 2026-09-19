import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import apiClient from '../api/client';

jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'test-project-id' } } } },
}));
jest.mock('../api/client', () => ({
  __esModule: true,
  default: { post: jest.fn().mockResolvedValue({}), delete: jest.fn().mockResolvedValue({}) },
}));

import {
  computeNotificationBehavior,
  getColdStartNotificationData,
  notificationDataKey,
  registerForPushNotifications,
  resetPushTokenCache,
  setActiveConversationKey,
  unregisterPushNotifications,
} from './push';

const mockPost = apiClient.post as jest.Mock;
const mockDelete = apiClient.delete as jest.Mock;
const getPermissionsAsync = Notifications.getPermissionsAsync as jest.Mock;
const requestPermissionsAsync = Notifications.requestPermissionsAsync as jest.Mock;
const getExpoPushTokenAsync = Notifications.getExpoPushTokenAsync as jest.Mock;
const getLastNotificationResponseAsync = Notifications.getLastNotificationResponseAsync as jest.Mock;
const setNotificationChannelAsync = Notifications.setNotificationChannelAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  setActiveConversationKey(null);
  resetPushTokenCache();
  Platform.OS = 'android';
  getPermissionsAsync.mockResolvedValue({ status: 'granted' });
  requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
  getExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[abc123]' });
  getLastNotificationResponseAsync.mockResolvedValue(null);
  setNotificationChannelAsync.mockResolvedValue(undefined);
  mockPost.mockResolvedValue({});
  mockDelete.mockResolvedValue({});
});

describe('notificationDataKey', () => {
  it('formats a room notification as "room:<id>"', () => {
    expect(notificationDataKey({ roomId: 'r1' })).toBe('room:r1');
  });

  it('formats a DM notification as "dm:<id>"', () => {
    expect(notificationDataKey({ conversationId: 'c1' })).toBe('dm:c1');
  });

  it('returns null for a payload with neither id', () => {
    expect(notificationDataKey({})).toBeNull();
  });

  it('prefers roomId when a payload somehow has both', () => {
    expect(notificationDataKey({ roomId: 'r1', conversationId: 'c1' })).toBe('room:r1');
  });
});

describe('computeNotificationBehavior', () => {
  it('shows banner/sound/list for a chat the user is not currently viewing', () => {
    setActiveConversationKey('dm:other-conversation');
    const behavior = computeNotificationBehavior({ conversationId: 'c1' });
    expect(behavior).toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    });
  });

  it('suppresses banner/sound/list for the chat currently open — matches WhatsApp', () => {
    setActiveConversationKey('dm:c1');
    const behavior = computeNotificationBehavior({ conversationId: 'c1' });
    expect(behavior.shouldShowBanner).toBe(false);
    expect(behavior.shouldShowList).toBe(false);
    expect(behavior.shouldPlaySound).toBe(false);
  });

  it('does not suppress a room notification just because a DM with the same raw id is open', () => {
    setActiveConversationKey('dm:1'); // DM conversation "1" is open
    const behavior = computeNotificationBehavior({ roomId: '1' }); // room "1" notification arrives
    expect(behavior.shouldShowBanner).toBe(true);
  });

  it('never suppresses when nothing is open (activeConversationKey is null)', () => {
    setActiveConversationKey(null);
    const behavior = computeNotificationBehavior({ conversationId: 'c1' });
    expect(behavior.shouldShowBanner).toBe(true);
  });

  it('still sets the badge even for the suppressed/active chat', () => {
    setActiveConversationKey('room:r1');
    const behavior = computeNotificationBehavior({ roomId: 'r1' });
    expect(behavior.shouldSetBadge).toBe(true);
  });
});

describe('registerForPushNotifications', () => {
  it('requests permission, sets up the Android channel, and registers the token with the backend', async () => {
    await registerForPushNotifications();

    expect(setNotificationChannelAsync).toHaveBeenCalledWith('messages', expect.objectContaining({ name: 'Messages' }));
    expect(getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'test-project-id' });
    expect(mockPost).toHaveBeenCalledWith('/push/mobile/register', {
      expoPushToken: 'ExponentPushToken[abc123]',
      platform: expect.any(String),
    });
  });

  it('does not request a token when permission is denied', async () => {
    getPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    requestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });

    await registerForPushNotifications();

    expect(getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('only re-requests permission if not already granted', async () => {
    getPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });

    await registerForPushNotifications();

    expect(requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('does not throw if the backend registration call fails', async () => {
    mockPost.mockRejectedValueOnce(new Error('network down'));
    await expect(registerForPushNotifications()).resolves.toBeUndefined();
  });
});

describe('unregisterPushNotifications', () => {
  it('is a no-op if a token was never registered', async () => {
    await unregisterPushNotifications();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deletes the exact token that was previously registered', async () => {
    await registerForPushNotifications();
    await unregisterPushNotifications();

    expect(mockDelete).toHaveBeenCalledWith('/push/mobile/register', {
      data: { expoPushToken: 'ExponentPushToken[abc123]' },
    });
  });

  it('clears the cached token so a second call is a no-op', async () => {
    await registerForPushNotifications();
    await unregisterPushNotifications();
    mockDelete.mockClear();

    await unregisterPushNotifications();

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('does not throw if the backend call fails', async () => {
    await registerForPushNotifications();
    mockDelete.mockRejectedValueOnce(new Error('network down'));

    await expect(unregisterPushNotifications()).resolves.toBeUndefined();
  });
});

describe('getColdStartNotificationData', () => {
  it('returns null when the app was not opened via a notification tap', async () => {
    getLastNotificationResponseAsync.mockResolvedValueOnce(null);
    await expect(getColdStartNotificationData()).resolves.toBeNull();
  });

  it('returns the notification data when the app was launched by tapping one', async () => {
    getLastNotificationResponseAsync.mockResolvedValueOnce({
      notification: { request: { content: { data: { conversationId: 'c1' } } } },
    });

    await expect(getColdStartNotificationData()).resolves.toEqual({ conversationId: 'c1' });
  });
});
