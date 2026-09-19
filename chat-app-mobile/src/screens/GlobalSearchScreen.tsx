import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { searchApi } from '../api/search';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { useDMStore } from '../store/dmStore';
import { useRoomStore } from '../store/roomStore';
import { useUserCacheStore } from '../store/userCacheStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii } from '../theme/tokens';
import { Message } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'GlobalSearch'>;

const DM_PREFIX = 'dm:';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function GlobalSearchScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const myUsername = useAuthStore((s) => s.user?.username);
  const myRooms = useRoomStore((s) => s.myRooms);
  const conversations = useDMStore((s) => s.conversations);
  const users = useUserCacheStore((s) => s.users);
  const getUser = useUserCacheStore((s) => s.getUser);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    setIsSearching(true);
    setError(null);
    const timer = setTimeout(() => {
      searchApi
        .searchMessages(q, 30)
        .then(setResults)
        .catch(() => setError('Search failed. Please try again.'))
        .finally(() => setIsSearching(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Resolve any DM participants we don't have cached yet, so labels/avatars aren't blank
  useEffect(() => {
    results.forEach((m) => {
      if (!m.roomId.startsWith(DM_PREFIX)) return;
      const conv = conversations.find((c) => c.id === m.roomId.slice(DM_PREFIX.length));
      const other = conv?.participants.find((p) => p !== myUsername);
      if (other && !users[other]) void getUser(other);
    });
  }, [results, conversations, myUsername, users, getUser]);

  const getRoomLabel = useMemo(() => (roomId: string): string => {
    if (roomId.startsWith(DM_PREFIX)) {
      const conv = conversations.find((c) => c.id === roomId.slice(DM_PREFIX.length));
      const other = conv?.participants.find((p) => p !== myUsername);
      const u = other ? users[other] : undefined;
      return u?.displayName || u?.uniqueHandle || other || 'Direct Message';
    }
    const room = myRooms.find((r) => r.roomId === roomId);
    return room ? `#${room.name}` : `#${roomId}`;
  }, [myRooms, conversations, myUsername, users]);

  const handleSelect = (message: Message) => {
    const isDM = message.roomId.startsWith(DM_PREFIX);
    navigation.navigate('Conversation', {
      roomId: message.roomId,
      name: getRoomLabel(message.roomId),
      kind: isDM ? 'dm' : 'room',
      highlightMessageId: message.id,
    });
  };

  const grouped = useMemo(() => {
    const map = new Map<string, Message[]>();
    results.forEach((m) => {
      const list = map.get(m.roomId) ?? [];
      list.push(m);
      map.set(m.roomId, list);
    });
    return Array.from(map.entries());
  }, [results]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
      <View style={[styles.header, { borderBottomColor: tokens.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="chevron-left" size={22} color={tokens.text} />
        </TouchableOpacity>
        <View style={[styles.field, { backgroundColor: tokens.surface }]}>
          <Feather name="search" size={16} color={tokens.textMuted} />
          <TextInput
            placeholder="Search messages…"
            placeholderTextColor={tokens.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            style={{ flex: 1, color: tokens.text, fontSize: 14, marginLeft: 8 }}
          />
        </View>
      </View>

      {error ? (
        <Text style={{ color: '#DC5B4E', fontSize: 12, textAlign: 'center', paddingVertical: 8 }}>{error}</Text>
      ) : null}

      {isSearching ? <ActivityIndicator style={{ marginTop: 24 }} color={tokens.accent} /> : null}

      {!isSearching && !error && query.trim().length >= 2 && results.length === 0 ? (
        <Text style={{ color: tokens.textMuted, fontSize: 13, textAlign: 'center', marginTop: 32 }}>
          No results for "{query}"
        </Text>
      ) : null}

      {query.trim().length === 0 ? (
        <Text style={{ color: tokens.textMuted, fontSize: 13, textAlign: 'center', marginTop: 32 }}>
          Search across all your conversations
        </Text>
      ) : null}

      <FlatList
        data={grouped}
        keyExtractor={([roomId]) => roomId}
        contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 24 }}
        renderItem={({ item: [roomId, messages] }) => (
          <View style={{ marginBottom: 6 }}>
            <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>{getRoomLabel(roomId)}</Text>
            {messages.map((msg) => (
              <TouchableOpacity key={msg.id} style={styles.row} onPress={() => handleSelect(msg)}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                    <Text style={[styles.sender, { color: tokens.accentStrong }]}>{msg.senderName}</Text>
                    <Text style={{ color: tokens.textMuted, fontSize: 11 }}>{formatTime(msg.timestamp)}</Text>
                  </View>
                  <Text style={{ color: tokens.text, fontSize: 13.5 }} numberOfLines={2}>
                    {msg.content}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: radii.control, paddingVertical: 10, paddingHorizontal: 14 },
  row: { padding: 10, borderRadius: 12 },
  sectionLabel: { fontFamily: fonts.label, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 2 },
  sender: { fontFamily: fonts.label, fontSize: 12.5 },
});
