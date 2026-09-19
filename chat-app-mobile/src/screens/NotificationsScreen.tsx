import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { registerForPushNotifications, unregisterPushNotifications } from '../notifications/push';
import { useNotificationPrefsStore } from '../store/notificationPrefsStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

export default function NotificationsScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const enabled = useNotificationPrefsStore((s) => s.enabled);
  const sound = useNotificationPrefsStore((s) => s.sound);
  const setEnabled = useNotificationPrefsStore((s) => s.setEnabled);
  const setSound = useNotificationPrefsStore((s) => s.setSound);
  const [osPermission, setOsPermission] = useState<Notifications.PermissionStatus | null>(null);

  useEffect(() => {
    Notifications.getPermissionsAsync().then((p) => setOsPermission(p.status));
  }, []);

  const handleToggleEnabled = async (value: boolean) => {
    setEnabled(value);
    if (value) {
      await registerForPushNotifications();
      const p = await Notifications.getPermissionsAsync();
      setOsPermission(p.status);
    } else {
      await unregisterPushNotifications();
    }
  };

  const osDenied = osPermission === 'denied';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
      <View style={[styles.header, { borderBottomColor: tokens.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="chevron-left" size={22} color={tokens.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: tokens.text }]}>Notifications</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.body}>
        {osDenied ? (
          <TouchableOpacity
            style={[styles.warningBanner, { backgroundColor: tokens.surface }]}
            onPress={() => Linking.openSettings()}
          >
            <Feather name="alert-triangle" size={16} color="#DC5B4E" />
            <Text style={{ color: tokens.text, fontSize: 12.5, flex: 1 }}>
              Notifications are turned off for Baaat in your phone's system settings. Tap to open Settings.
            </Text>
          </TouchableOpacity>
        ) : null}

        <View style={[styles.row, { backgroundColor: tokens.surface, borderRadius: radii.control }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: tokens.text }]}>Message notifications</Text>
            <Text style={{ color: tokens.textMuted, fontSize: 12 }}>
              {enabled ? 'On for this device' : 'Off — you won\'t get pushes for new messages or calls'}
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={handleToggleEnabled}
            trackColor={{ false: tokens.border, true: tokens.accent }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={[styles.row, { backgroundColor: tokens.surface, borderRadius: radii.control }, !enabled && styles.disabledRow]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: tokens.text }]}>Sound</Text>
            <Text style={{ color: tokens.textMuted, fontSize: 12 }}>Play a sound for new notifications</Text>
          </View>
          <Switch
            value={sound}
            onValueChange={setSound}
            disabled={!enabled}
            trackColor={{ false: tokens.border, true: tokens.accent }}
            thumbColor="#FFFFFF"
          />
        </View>

        <Text style={{ color: tokens.textMuted, fontSize: 11.5, marginTop: 4, paddingHorizontal: 4 }}>
          {Platform.OS === 'android'
            ? 'Android also lets you fine-tune the notification channel (badge, banner, vibration) from the system Settings app.'
            : 'You can further customize alerts, badges, and banners from the iOS Settings app.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontFamily: fonts.heading, fontSize: 16, letterSpacing: -0.2 },
  body: { padding: 20, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
  disabledRow: { opacity: 0.5 },
  rowLabel: { fontFamily: fonts.label, fontSize: 14.5 },
  warningBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, marginBottom: 4 },
});
