import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from './Avatar';
import { messagesApi } from '../api/messages';
import { useAuthStore } from '../store/authStore';
import { useDMStore } from '../store/dmStore';
import { useRoomStore } from '../store/roomStore';
import { useUserCacheStore } from '../store/userCacheStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii } from '../theme/tokens';

interface Props {
  messageIds: string[];
  onClose: () => void;
  onForwarded: () => void;
}

type Target = { key: string; label: string; onPress: () => Promise<void> };

function DMTargetRow({ conversationId, onPress }: { conversationId: string; onPress: () => void }) {
  const { tokens } = useTheme();
  const username = useAuthStore((s) => s.user?.username);
  const conversation = useDMStore((s) => s.conversations.find((c) => c.id === conversationId));
  const otherUsername = conversation?.participants.find((p) => p !== username);
  const cachedUser = useUserCacheStore((s) => (otherUsername ? s.users[otherUsername] : undefined));
  const getUser = useUserCacheStore((s) => s.getUser);

  React.useEffect(() => {
    if (otherUsername && !cachedUser) getUser(otherUsername);
  }, [otherUsername, cachedUser, getUser]);

  const name = cachedUser?.displayName || cachedUser?.uniqueHandle || otherUsername || 'Chat';

  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Avatar initials={name.slice(0, 2).toUpperCase()} color={tokens.accent} textColor={tokens.onAccent} size={38} imageUrl={cachedUser?.avatarUrl} />
      <Text style={{ color: tokens.text, fontSize: 14.5, fontFamily: fonts.label, flex: 1 }} numberOfLines={1}>
        {name}
      </Text>
    </TouchableOpacity>
  );
}

export default function ForwardMessageModal({ messageIds, onClose, onForwarded }: Props) {
  const { tokens } = useTheme();
  const myRooms = useRoomStore((s) => s.myRooms);
  const conversations = useDMStore((s) => s.conversations);
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const idsKey = messageIds.join(',');

  // This component stays mounted (rendering null) rather than unmounting between
  // opens, so local state doesn't reset on its own — clear it whenever a new
  // message starts being forwarded, otherwise a stale sendingKey from a previous
  // successful forward would make every subsequent attempt silently no-op.
  useEffect(() => {
    setSendingKey(null);
  }, [idsKey]);

  if (messageIds.length === 0) return null;

  const send = async (key: string, target: { roomId: string } | { conversationId: string }) => {
    if (sendingKey) return;
    setSendingKey(key);
    try {
      for (const id of messageIds) {
        await messagesApi.forward(id, target);
      }
      onForwarded();
    } catch {
      setSendingKey(null);
    }
  };

  const roomTargets: Target[] = myRooms.map((room) => ({
    key: `room:${room.roomId}`,
    label: room.name,
    onPress: () => send(`room:${room.roomId}`, { roomId: room.roomId }),
  }));

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <SafeAreaView style={styles.safe} edges={['bottom']}>
          <Pressable style={[styles.sheet, { backgroundColor: tokens.surface }]}>
            <View style={styles.header}>
              <Text style={{ color: tokens.text, fontSize: 16, fontFamily: fonts.heading }}>
                {messageIds.length > 1 ? `Forward ${messageIds.length} messages to…` : 'Forward to…'}
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <Feather name="x" size={20} color={tokens.textMuted} />
              </TouchableOpacity>
            </View>

            <FlatList
              style={{ maxHeight: 420 }}
              data={[
                ...conversations.map((c) => ({ kind: 'dm' as const, id: c.id })),
                ...roomTargets.map((t) => ({ kind: 'room' as const, id: t.key })),
              ]}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={
                conversations.length > 0 ? (
                  <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>MESSAGES</Text>
                ) : null
              }
              renderItem={({ item, index }) => {
                if (item.kind === 'dm') {
                  const isSending = sendingKey === `dm:${item.id}`;
                  return (
                    <View style={{ opacity: isSending ? 0.5 : 1 }}>
                      <DMTargetRow conversationId={item.id} onPress={() => send(`dm:${item.id}`, { conversationId: item.id })} />
                      {isSending ? <ActivityIndicator style={StyleSheet.absoluteFill} color={tokens.accent} /> : null}
                    </View>
                  );
                }
                const target = roomTargets.find((t) => t.key === item.id)!;
                const isFirstRoom = index === conversations.length;
                const isSending = sendingKey === item.id;
                return (
                  <>
                    {isFirstRoom ? <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>ROOMS</Text> : null}
                    <TouchableOpacity style={[styles.row, { opacity: isSending ? 0.5 : 1 }]} onPress={target.onPress} disabled={!!sendingKey}>
                      <Avatar initials={target.label.slice(0, 2).toUpperCase()} color={tokens.accentStrong} textColor={tokens.onAccent} size={38} />
                      <Text style={{ color: tokens.text, fontSize: 14.5, fontFamily: fonts.label, flex: 1 }} numberOfLines={1}>
                        {target.label}
                      </Text>
                      {isSending ? <ActivityIndicator color={tokens.accent} /> : null}
                    </TouchableOpacity>
                  </>
                );
              }}
              ListEmptyComponent={
                <Text style={{ color: tokens.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 24 }}>
                  No chats to forward to yet.
                </Text>
              }
            />
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  safe: { width: '100%' },
  sheet: { borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card, paddingTop: 14, paddingBottom: 8, paddingHorizontal: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10 },
  sectionLabel: { fontSize: 11, fontFamily: fonts.label, letterSpacing: 1, marginTop: 8, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
});
