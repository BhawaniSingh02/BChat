import { Feather } from '@expo/vector-icons';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii } from '../theme/tokens';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Settings'>,
  NativeStackScreenProps<RootStackParamList>
>;

const rows: { icon: keyof typeof Feather.glyphMap; label: string; route?: 'Account' | 'Privacy' | 'Notifications' | 'Help' }[] = [
  { icon: 'clock', label: 'Account', route: 'Account' },
  { icon: 'shield', label: 'Privacy', route: 'Privacy' },
  { icon: 'bell', label: 'Notifications', route: 'Notifications' },
  { icon: 'help-circle', label: 'Help', route: 'Help' },
];

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

export default function SettingsScreen({ navigation }: Props) {
  const { tokens, mode, setMode } = useTheme();
  const { user, signOut } = useAuthStore();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]} edges={['top']}>
      <Text style={[styles.title, { color: tokens.text }]}>Settings</Text>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18 }}>
        <TouchableOpacity style={styles.profileRow} onPress={() => navigation.navigate('EditProfile')}>
          <Avatar
            initials={initialsFor(user?.displayName ?? user?.username ?? '??')}
            color={tokens.accent}
            textColor={tokens.onAccent}
            size={54}
            imageUrl={user?.avatarUrl}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.pname, { color: tokens.text }]}>{user?.displayName || user?.username}</Text>
            <Text style={[styles.phandle, { color: tokens.textMuted }]} numberOfLines={1}>
              {user?.statusMessage || `@${user?.uniqueHandle ?? '—'} · Tap to edit profile`}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={tokens.tabInactive} />
        </TouchableOpacity>

        {rows.map((row) => (
          <TouchableOpacity
            key={row.label}
            style={styles.row}
            onPress={() => row.route && navigation.navigate(row.route)}
            disabled={!row.route}
          >
            <View style={[styles.sicon, { backgroundColor: tokens.surface }]}>
              <Feather name={row.icon} size={16} color={tokens.text} />
            </View>
            <Text style={[styles.label, { color: tokens.text }]}>{row.label}</Text>
            <Feather name="chevron-right" size={16} color={tokens.tabInactive} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.row}
          onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')}
        >
          <View style={[styles.sicon, { backgroundColor: tokens.surface }]}>
            <Feather name="sun" size={16} color={tokens.text} />
          </View>
          <Text style={[styles.label, { color: tokens.text }]}>Appearance</Text>
          <Text style={{ color: tokens.textMuted, fontFamily: fonts.label, fontSize: 12 }}>
            {mode === 'dark' ? 'Dark' : 'Light'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => signOut()}>
          <View style={[styles.sicon, { backgroundColor: tokens.surface }]}>
            <Feather name="log-out" size={16} color="#DC5B4E" />
          </View>
          <Text style={[styles.label, { color: '#DC5B4E' }]}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  title: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -1, paddingHorizontal: 18, paddingVertical: 10 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  pname: { fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3 },
  phandle: { fontSize: 12, marginTop: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13 },
  sicon: { width: 30, height: 30, borderRadius: radii.avatar - 3, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontFamily: fonts.label, fontSize: 14 },
});
