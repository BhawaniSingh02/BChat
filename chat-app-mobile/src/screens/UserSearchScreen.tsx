import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usersApi } from '../api/users';
import Avatar from '../components/Avatar';
import { RootStackParamList } from '../navigation/types';
import { useDMStore } from '../store/dmStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii } from '../theme/tokens';
import { UserSummary } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'UserSearch'>;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

export default function UserSearchScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const { getOrCreateConversation } = useDMStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isStarting, setIsStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      usersApi
        .search(q)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = async (user: UserSummary) => {
    setIsStarting(user.username);
    setError(null);
    try {
      const conversation = await getOrCreateConversation(user.username);
      navigation.replace('Conversation', {
        roomId: `dm:${conversation.id}`,
        name: user.displayName || user.uniqueHandle,
        kind: 'dm',
      });
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.response?.data?.message ?? "Couldn't start that chat.");
    } finally {
      setIsStarting(null);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
      <View style={[styles.header, { borderBottomColor: tokens.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="chevron-left" size={22} color={tokens.text} />
        </TouchableOpacity>
        <View style={[styles.field, { backgroundColor: tokens.surface }]}>
          <Feather name="search" size={16} color={tokens.textMuted} />
          <TextInput
            placeholder="Search by name or @handle"
            placeholderTextColor={tokens.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="none"
            style={{ flex: 1, color: tokens.text, fontSize: 14, marginLeft: 8 }}
          />
        </View>
      </View>

      {error ? (
        <Text style={{ color: '#DC5B4E', fontSize: 12, textAlign: 'center', paddingVertical: 8 }}>{error}</Text>
      ) : null}

      {isSearching ? <ActivityIndicator style={{ marginTop: 24 }} color={tokens.accent} /> : null}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => handleSelect(item)} disabled={!!isStarting}>
            <Avatar initials={initialsFor(item.displayName || item.uniqueHandle)} color={tokens.accent} textColor={tokens.onAccent} imageUrl={item.avatarUrl} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: tokens.text }]}>{item.displayName || item.uniqueHandle}</Text>
              <Text style={[styles.handle, { color: tokens.textMuted }]}>@{item.uniqueHandle}</Text>
            </View>
            {isStarting === item.username ? <ActivityIndicator size="small" color={tokens.accent} /> : null}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: radii.control, paddingVertical: 10, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14 },
  name: { fontFamily: fonts.heading, fontSize: 14.5 },
  handle: { fontSize: 12.5, marginTop: 2 },
});
