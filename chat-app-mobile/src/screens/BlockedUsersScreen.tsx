import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { useUserCacheStore } from '../store/userCacheStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii, ThemeTokens } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'BlockedUsers'>;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function BlockedUserRow({ username, tokens }: { username: string; tokens: ThemeTokens }) {
  const unblockUser = useAuthStore((s) => s.unblockUser);
  const cachedUser = useUserCacheStore((s) => s.users[username]);
  const getUser = useUserCacheStore((s) => s.getUser);
  const [isUnblocking, setIsUnblocking] = useState(false);

  useEffect(() => {
    if (!cachedUser) getUser(username);
  }, [username, cachedUser, getUser]);

  const name = cachedUser?.displayName || cachedUser?.uniqueHandle || username;

  const confirmUnblock = () => {
    Alert.alert(`Unblock ${name}?`, 'They will be able to message and call you again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: async () => {
          setIsUnblocking(true);
          try {
            await unblockUser(username);
          } finally {
            setIsUnblocking(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.row}>
      <Avatar initials={initialsFor(name)} color={tokens.accent} textColor={tokens.onAccent} size={42} imageUrl={cachedUser?.avatarUrl} />
      <Text style={{ color: tokens.text, fontSize: 14.5, fontFamily: fonts.label, flex: 1 }} numberOfLines={1}>
        {name}
      </Text>
      <TouchableOpacity
        style={[styles.unblockBtn, { backgroundColor: tokens.surface, borderRadius: radii.control }]}
        onPress={confirmUnblock}
        disabled={isUnblocking}
      >
        {isUnblocking ? (
          <ActivityIndicator size="small" color={tokens.text} />
        ) : (
          <Text style={{ color: tokens.text, fontSize: 12.5, fontFamily: fonts.label }}>Unblock</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function BlockedUsersScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const blockedUsers = useAuthStore((s) => s.user?.blockedUsers ?? []);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
      <View style={[styles.header, { borderBottomColor: tokens.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="chevron-left" size={22} color={tokens.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: tokens.text }]}>Blocked users</Text>
        <View style={{ width: 22 }} />
      </View>

      {blockedUsers.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="slash" size={26} color={tokens.textMuted} />
          <Text style={{ color: tokens.textMuted, fontSize: 13, marginTop: 8 }}>No blocked users</Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(u) => u}
          contentContainerStyle={{ padding: 20, gap: 4 }}
          renderItem={({ item }) => <BlockedUserRow username={item} tokens={tokens} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontFamily: fonts.heading, fontSize: 16, letterSpacing: -0.2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  unblockBtn: { paddingVertical: 8, paddingHorizontal: 14 },
});
