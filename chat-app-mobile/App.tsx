import {
  Archivo_400Regular,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/archivo';
import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CallOverlay from './src/components/CallOverlay';
import { navigationRef } from './src/navigation/navigationRef';
import { getColdStartNotificationData, initNotificationHandler } from './src/notifications/push';
import RootNavigator from './src/navigation/RootNavigator';
import { socketManager } from './src/realtime/socket';
import { useAuthStore } from './src/store/authStore';
import { useCallStore } from './src/store/callStore';
import { useDMStore } from './src/store/dmStore';
import { useRoomStore } from './src/store/roomStore';
import { useUserCacheStore } from './src/store/userCacheStore';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

SplashScreen.preventAutoHideAsync();

/**
 * Shared by both the live tap listener (app already running) and the cold-start
 * check (app was fully closed, launched by tapping a notification) — those are
 * two separate expo-notifications APIs but should land on the same screen.
 */
async function navigateToNotificationTarget(data: { roomId?: string; conversationId?: string }): Promise<void> {
  if (!navigationRef.isReady()) return;
  if (data.roomId) {
    const room = useRoomStore.getState().myRooms.find((r) => r.roomId === data.roomId);
    navigationRef.navigate('Conversation', { roomId: data.roomId, name: room?.name ?? 'Chat', kind: 'room' });
  } else if (data.conversationId) {
    const state = useDMStore.getState();
    const conversation =
      state.conversations.find((c) => c.id === data.conversationId) ??
      state.requests.find((c) => c.id === data.conversationId);
    const username = useAuthStore.getState().user?.username;
    const otherUsername = conversation?.participants.find((p) => p !== username);
    const otherUser = otherUsername ? await useUserCacheStore.getState().getUser(otherUsername) : null;
    navigationRef.navigate('Conversation', {
      roomId: `dm:${data.conversationId}`,
      name: otherUser?.displayName || otherUser?.uniqueHandle || 'Chat',
      kind: 'dm',
    });
  }
}

function AppShell() {
  const { mode } = useTheme();

  useEffect(() => {
    useCallStore.getState().initCallListener();
    initNotificationHandler();
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateToNotificationTarget(response.notification.request.content.data as { roomId?: string; conversationId?: string });
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const unsubscribe = socketManager.onRoomEvent((event) => {
      useRoomStore.getState().applyRoomEvent(event);
      // room === null on this event type means it's about the current user having
      // just been kicked (they're no longer a member, so there's nothing to patch) —
      // bounce them out if they're currently looking at that group.
      if (event.eventType === 'MEMBER_REMOVED' && !event.room && navigationRef.isReady()) {
        const current = navigationRef.getCurrentRoute();
        const onThatRoom =
          (current?.name === 'Conversation' || current?.name === 'GroupInfo') &&
          (current.params as { roomId?: string } | undefined)?.roomId === event.roomId;
        Alert.alert('Removed from group', "You're no longer a member of this group.");
        if (onThatRoom) {
          navigationRef.navigate('Main');
        }
      }
    });
    return unsubscribe;
  }, []);

  // App was fully closed and launched by tapping a notification — the listener
  // above only catches taps while the JS runtime is already alive, so this is
  // the only way to catch that specific case. Fires once navigation is ready.
  const handleNavigationReady = useCallback(() => {
    getColdStartNotificationData().then((data) => {
      if (data) navigateToNotificationTarget(data);
    });
  }, []);

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer ref={navigationRef} onReady={handleNavigationReady}>
        <RootNavigator />
      </NavigationContainer>
      <CallOverlay />
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
  });
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const ready = fontsLoaded && !isBootstrapping;

  const onLayout = useCallback(async () => {
    if (ready) await SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider onLayout={onLayout}>
      <KeyboardProvider>
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
