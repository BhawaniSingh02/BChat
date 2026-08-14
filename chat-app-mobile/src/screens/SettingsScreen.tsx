import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii } from '../theme/tokens';

const rows: { icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { icon: 'clock', label: 'Account' },
  { icon: 'shield', label: 'Privacy' },
  { icon: 'bell', label: 'Notifications' },
  { icon: 'help-circle', label: 'Help' },
];

export default function SettingsScreen() {
  const { tokens, mode, setMode } = useTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]} edges={['top']}>
      <Text style={[styles.title, { color: tokens.text }]}>Settings</Text>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18 }}>
        <View style={styles.profileRow}>
          <Avatar initials="BS" color={tokens.accent} textColor={tokens.onAccent} size={54} />
          <View>
            <Text style={[styles.pname, { color: tokens.text }]}>Bhawani Singh</Text>
            <Text style={[styles.phandle, { color: tokens.textMuted }]}>@bhawani · Tap to edit profile</Text>
          </View>
        </View>

        {rows.map((row) => (
          <TouchableOpacity key={row.label} style={styles.row}>
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
