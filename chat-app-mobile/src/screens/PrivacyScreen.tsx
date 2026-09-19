import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii, ThemeTokens } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Privacy'>;

const LABELS: Record<string, string> = {
  EVERYONE: 'Everyone',
  CONTACTS: 'My Contacts',
  NOBODY: 'Nobody',
  ANYONE: 'Anyone',
  APPROVED_ONLY: 'People I Approve',
};

function OptionRow({
  title,
  options,
  value,
  onSelect,
  tokens,
}: {
  title: string;
  options: string[];
  value: string;
  onSelect: (v: string) => Promise<void>;
  tokens: ThemeTokens;
}) {
  const [isSaving, setIsSaving] = useState(false);

  const handlePress = async (option: string) => {
    if (option === value || isSaving) return;
    setIsSaving(true);
    try {
      await onSelect(option);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.field}>
      <View style={styles.fieldTitleRow}>
        <Text style={[styles.label, { color: tokens.textMuted }]}>{title.toUpperCase()}</Text>
        {isSaving ? <ActivityIndicator size="small" color={tokens.textMuted} /> : null}
      </View>
      <View style={styles.chipRow}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <TouchableOpacity
              key={option}
              onPress={() => handlePress(option)}
              disabled={isSaving}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? tokens.accent : tokens.surface,
                  borderRadius: radii.control,
                },
              ]}
            >
              <Text style={{ color: selected ? tokens.onAccent : tokens.text, fontSize: 12.5, fontFamily: fonts.label }}>
                {LABELS[option] ?? option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function PrivacyScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const { user, updateProfile, updateWhoCanMessage } = useAuthStore();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
      <View style={[styles.header, { borderBottomColor: tokens.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="chevron-left" size={22} color={tokens.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: tokens.text }]}>Privacy</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={{ color: tokens.textMuted, fontSize: 12.5, marginBottom: 4 }}>Control who can see your information.</Text>

        <OptionRow
          title="Last seen"
          options={['EVERYONE', 'CONTACTS', 'NOBODY']}
          value={user?.lastSeenPrivacy ?? 'EVERYONE'}
          onSelect={(v) => updateProfile({ lastSeenPrivacy: v })}
          tokens={tokens}
        />
        <OptionRow
          title="Online status"
          options={['EVERYONE', 'NOBODY']}
          value={user?.onlinePrivacy ?? 'EVERYONE'}
          onSelect={(v) => updateProfile({ onlinePrivacy: v })}
          tokens={tokens}
        />
        <OptionRow
          title="Profile photo"
          options={['EVERYONE', 'CONTACTS', 'NOBODY']}
          value={user?.profilePhotoPrivacy ?? 'EVERYONE'}
          onSelect={(v) => updateProfile({ profilePhotoPrivacy: v })}
          tokens={tokens}
        />
        <OptionRow
          title="Who can message you"
          options={['ANYONE', 'APPROVED_ONLY', 'NOBODY']}
          value={user?.whoCanMessage ?? 'ANYONE'}
          onSelect={updateWhoCanMessage}
          tokens={tokens}
        />

        <TouchableOpacity
          style={[styles.actionRow, { backgroundColor: tokens.surface, borderRadius: radii.control }]}
          onPress={() => navigation.navigate('BlockedUsers')}
        >
          <Feather name="slash" size={16} color={tokens.text} />
          <Text style={{ color: tokens.text, fontSize: 14, fontFamily: fonts.label, flex: 1 }}>Blocked users</Text>
          <Text style={{ color: tokens.textMuted, fontSize: 13 }}>{user?.blockedUsers?.length ?? 0}</Text>
          <Feather name="chevron-right" size={16} color={tokens.tabInactive} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontFamily: fonts.heading, fontSize: 16, letterSpacing: -0.2 },
  body: { padding: 20, gap: 22 },
  field: { gap: 8 },
  fieldTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 9, paddingHorizontal: 14 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14, marginTop: 4 },
});
