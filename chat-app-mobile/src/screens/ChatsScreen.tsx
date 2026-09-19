import { Feather } from '@expo/vector-icons';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';
import DMRequestRow from '../components/DMRequestRow';
import DMRow from '../components/DMRow';
import StoriesBar from '../components/StoriesBar';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useDMStore } from '../store/dmStore';
import { usePresenceStore } from '../store/presenceStore';
import { useRoomStore } from '../store/roomStore';
import { useTheme } from '../theme/ThemeContext';
import { avatarPalette, fonts } from '../theme/tokens';
import { Room, UserSummary } from '../types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Chats'>,
  NativeStackScreenProps<RootStackParamList>
>;

type SubTab = 'messages' | 'rooms';

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

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

export default function ChatsScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const [subTab, setSubTab] = useState<SubTab>('messages');
  const { myRooms, unreadCounts: roomUnreadCounts, isLoading: roomsLoading, error: roomsError, fetchMyRooms, fetchUnreadCounts: fetchRoomUnreadCounts } = useRoomStore();
  const {
    conversations,
    requests,
    isLoading: dmLoading,
    error: dmError,
    fetchConversations,
    fetchRequests,
    acceptRequest,
    declineRequest,
    archiveConversation,
    fetchUnreadCounts: fetchDmUnreadCounts,
  } = useDMStore();
  const fetchOnlineUsers = usePresenceStore((s) => s.fetchOnlineUsers);

  useFocusEffect(
    useCallback(() => {
      fetchMyRooms();
      fetchConversations();
      fetchRequests();
      fetchOnlineUsers();
      fetchRoomUnreadCounts();
      fetchDmUnreadCounts();
    }, [fetchMyRooms, fetchConversations, fetchRequests, fetchOnlineUsers, fetchRoomUnreadCounts, fetchDmUnreadCounts]),
  );

  const openDM = (conversationId: string, otherUser: UserSummary) => {
    navigation.navigate('Conversation', {
      roomId: `dm:${conversationId}`,
      name: otherUser.displayName || otherUser.uniqueHandle,
      kind: 'dm',
    });
  };

  const confirmDeleteChat = (conversationId: string) => {
    Alert.alert('Delete chat?', 'This removes it from your list. The other person can still see the conversation.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => archiveConversation(conversationId) },
    ]);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: tokens.text }]}>Chats</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[styles.ghostBtn, { backgroundColor: tokens.surface }]} onPress={() => navigation.navigate('GlobalSearch')}>
            <Feather name="search" size={16} color={tokens.text} />
          </TouchableOpacity>
          {subTab === 'messages' ? (
            <TouchableOpacity style={[styles.ghostBtn, { backgroundColor: tokens.surface }]} onPress={() => navigation.navigate('UserSearch')}>
              <Feather name="edit" size={16} color={tokens.text} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.ghostBtn, { backgroundColor: tokens.surface }]} onPress={() => navigation.navigate('CreateGroup')}>
              <Feather name="plus" size={18} color={tokens.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.switcher, { backgroundColor: tokens.surface }]}>
        <TouchableOpacity
          style={[styles.switchBtn, subTab === 'messages' && { backgroundColor: tokens.background }]}
          onPress={() => setSubTab('messages')}
        >
          <Text style={{ color: subTab === 'messages' ? tokens.text : tokens.textMuted, fontFamily: fonts.label, fontSize: 13 }}>
            Messages
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.switchBtn, subTab === 'rooms' && { backgroundColor: tokens.background }]}
          onPress={() => setSubTab('rooms')}
        >
          <Text style={{ color: subTab === 'rooms' ? tokens.text : tokens.textMuted, fontFamily: fonts.label, fontSize: 13 }}>
            Rooms
          </Text>
        </TouchableOpacity>
      </View>

      {subTab === 'messages' ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 8 }}
          refreshControl={
            <RefreshControl
              refreshing={dmLoading}
              onRefresh={() => {
                fetchConversations();
                fetchRequests();
              }}
              tintColor={tokens.accent}
            />
          }
          ListHeaderComponent={
            <View>
              <View style={{ marginHorizontal: -8, marginBottom: 4 }}>
                <StoriesBar />
              </View>
              {requests.length > 0 ? (
                <View style={{ marginBottom: 8 }}>
                  <Text style={{ color: tokens.textMuted, fontFamily: fonts.label, fontSize: 11, letterSpacing: 1, paddingHorizontal: 10, marginBottom: 4 }}>
                    REQUESTS
                  </Text>
                  {requests.map((req) => (
                    <DMRequestRow
                      key={req.id}
                      conversation={req}
                      tokens={tokens}
                      accentColor={tokens.accent}
                      onAccept={() => acceptRequest(req.id)}
                      onDecline={() => declineRequest(req.id)}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            !dmLoading && !dmError ? (
              <View style={styles.empty}>
                <Text style={{ color: tokens.textMuted, fontSize: 13, textAlign: 'center' }}>
                  No messages yet. Tap the pencil to start a chat.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <DMRow
              conversation={item}
              tokens={tokens}
              accentColor={tokens.accent}
              onPress={(otherUser) => openDM(item.id, otherUser)}
              onLongPress={() => confirmDeleteChat(item.id)}
            />
          )}
        />
      ) : (
        <FlatList
          data={myRooms}
          keyExtractor={(item: Room) => item.id}
          contentContainerStyle={{ paddingHorizontal: 8 }}
          refreshControl={<RefreshControl refreshing={roomsLoading} onRefresh={fetchMyRooms} tintColor={tokens.accent} />}
          ListEmptyComponent={
            !roomsLoading && !roomsError ? (
              <View style={styles.empty}>
                <Text style={{ color: tokens.textMuted, fontSize: 13 }}>
                  No rooms yet. Join a room on the web app to see it here.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            const unread = roomUnreadCounts[item.roomId] ?? 0;
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => navigation.navigate('Conversation', { roomId: item.roomId, name: item.name, kind: 'room' })}
              >
                <Avatar initials={initialsFor(item.name)} color={avatarPalette[index % avatarPalette.length]} />
                <View style={styles.mid}>
                  <View style={styles.topLine}>
                    <Text
                      style={[styles.name, { color: tokens.text, fontFamily: unread > 0 ? fonts.display : fonts.heading }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text style={[styles.time, { color: unread > 0 ? tokens.accent : tokens.textMuted }]}>
                      {relativeTime(item.lastMessageAt)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text
                      style={[styles.preview, { color: unread > 0 ? tokens.text : tokens.textMuted, fontFamily: unread > 0 ? fonts.label : undefined }]}
                      numberOfLines={1}
                    >
                      {item.description || `${item.memberCount} members`}
                    </Text>
                    {unread > 0 ? (
                      <View style={{ backgroundColor: tokens.accent, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
                        <Text style={{ color: tokens.onAccent, fontFamily: fonts.heading, fontSize: 11 }}>{unread}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10 },
  title: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -1 },
  ghostBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  switcher: { flexDirection: 'row', marginHorizontal: 18, borderRadius: 11, padding: 3, marginBottom: 10 },
  switchBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  empty: { paddingHorizontal: 32, paddingTop: 40, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14 },
  mid: { flex: 1 },
  topLine: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontFamily: fonts.heading, fontSize: 15, letterSpacing: -0.2, flexShrink: 1 },
  time: { fontSize: 12, fontFamily: fonts.label },
  preview: { fontSize: 13, marginTop: 2 },
});
