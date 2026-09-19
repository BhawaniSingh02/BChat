import { Feather } from '@expo/vector-icons';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { callsApi } from '../api/calls';
import Avatar from '../components/Avatar';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { useCallStore } from '../store/callStore';
import { useUserCacheStore } from '../store/userCacheStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import { CallSession, UserSummary } from '../types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Calls'>,
  NativeStackScreenProps<RootStackParamList>
>;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function relativeTime(iso?: string): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function statusLabel(session: CallSession, outgoing: boolean): { text: string; color: 'muted' | 'danger' } {
  if (session.status === 'MISSED') return { text: outgoing ? 'No answer' : 'Missed', color: 'danger' };
  if (session.status === 'REJECTED') return { text: outgoing ? 'Declined' : 'Declined', color: 'danger' };
  if (session.durationSeconds > 0) {
    const m = Math.floor(session.durationSeconds / 60);
    const s = session.durationSeconds % 60;
    return { text: `${outgoing ? 'Outgoing' : 'Incoming'} · ${m}:${s.toString().padStart(2, '0')}`, color: 'muted' };
  }
  return { text: outgoing ? 'Outgoing' : 'Incoming', color: 'muted' };
}

function CallRow({ session, myUsername, tokens, onPress }: {
  session: CallSession;
  myUsername?: string;
  tokens: ReturnType<typeof useTheme>['tokens'];
  onPress: (otherUser: UserSummary) => void;
}) {
  const getUser = useUserCacheStore((s) => s.getUser);
  const [otherUser, setOtherUser] = useState<UserSummary | null>(null);
  const outgoing = session.callerId === myUsername;
  const otherUsername = outgoing ? session.calleeId : session.callerId;

  useEffect(() => {
    getUser(otherUsername).then(setOtherUser);
  }, [otherUsername, getUser]);

  const name = otherUser?.displayName || otherUser?.uniqueHandle || 'Loading…';
  const status = statusLabel(session, outgoing);

  return (
    <TouchableOpacity style={styles.row} onPress={() => otherUser && onPress(otherUser)} disabled={!otherUser}>
      <Avatar initials={initialsFor(name)} color={tokens.accent} textColor={tokens.onAccent} imageUrl={otherUser?.avatarUrl} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: tokens.text, fontFamily: fonts.heading, fontSize: 15, letterSpacing: -0.2 }} numberOfLines={1}>
          {name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
          <Feather
            name={outgoing ? 'arrow-up-right' : 'arrow-down-left'}
            size={12}
            color={status.color === 'danger' ? '#DC5B4E' : tokens.textMuted}
          />
          <Text style={{ color: status.color === 'danger' ? '#DC5B4E' : tokens.textMuted, fontSize: 12.5 }}>{status.text}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={{ color: tokens.textMuted, fontSize: 11.5 }}>{relativeTime(session.startedAt)}</Text>
        <Feather name={session.callType === 'VIDEO' ? 'video' : 'phone'} size={15} color={tokens.accentStrong} />
      </View>
    </TouchableOpacity>
  );
}

export default function CallsScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const myUsername = useAuthStore((s) => s.user?.username);
  const startOutgoingCall = useCallStore((s) => s.startOutgoingCall);
  const [history, setHistory] = useState<CallSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(() => {
    setIsLoading(true);
    callsApi
      .getMyHistory()
      .then(setHistory)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(load);

  const handleCallBack = (session: CallSession, otherUser: UserSummary) => {
    startOutgoingCall(session.conversationId, otherUser.username, session.callType);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: tokens.text }]}>Calls</Text>
        <TouchableOpacity style={[styles.ghostBtn, { backgroundColor: tokens.surface }]} onPress={() => navigation.navigate('UserSearch')}>
          <Feather name="phone-call" size={15} color={tokens.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 8 }}
        refreshing={isLoading}
        onRefresh={load}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={{ color: tokens.textMuted, fontSize: 13, textAlign: 'center' }}>
                No calls yet. Tap the icon above to search for someone and start one.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <CallRow session={item} myUsername={myUsername} tokens={tokens} onPress={(otherUser) => handleCallBack(item, otherUser)} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10 },
  title: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -1 },
  ghostBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  empty: { paddingHorizontal: 32, paddingTop: 40, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14 },
});
