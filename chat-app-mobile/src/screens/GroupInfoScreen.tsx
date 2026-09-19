import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';
import { roomsApi } from '../api/rooms';
import { RootStackParamList } from '../navigation/types';
import { socketManager } from '../realtime/socket';
import { useAuthStore } from '../store/authStore';
import { usePresenceStore } from '../store/presenceStore';
import { useRoomStore } from '../store/roomStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii, ThemeTokens } from '../theme/tokens';
import { UserSummary } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupInfo'>;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function MemberRow({
  member,
  isAdmin: memberIsAdmin,
  canKick,
  isKicking,
  online,
  tokens,
  onKick,
}: {
  member: UserSummary;
  isAdmin: boolean;
  canKick: boolean;
  isKicking: boolean;
  online: boolean;
  tokens: ThemeTokens;
  onKick: () => void;
}) {
  const displayName = member.displayName || member.uniqueHandle || member.username;
  return (
    <View style={styles.memberRow}>
      <Avatar
        initials={initialsFor(displayName)}
        color={tokens.accent}
        textColor={tokens.onAccent}
        size={42}
        imageUrl={member.avatarUrl}
        online={online}
        ringColor={tokens.background}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ color: tokens.text, fontSize: 14, fontFamily: fonts.label }} numberOfLines={1}>
          {displayName}
        </Text>
        {memberIsAdmin ? (
          <View style={styles.adminBadge}>
            <Feather name="shield" size={10} color={tokens.accentStrong} />
            <Text style={{ color: tokens.accentStrong, fontSize: 10.5, fontFamily: fonts.label }}>Admin</Text>
          </View>
        ) : null}
      </View>
      {canKick ? (
        <TouchableOpacity onPress={onKick} disabled={isKicking} hitSlop={8}>
          {isKicking ? <ActivityIndicator size="small" color="#DC5B4E" /> : <Feather name="user-x" size={17} color="#DC5B4E" />}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function GroupInfoScreen({ route, navigation }: Props) {
  const { tokens } = useTheme();
  const { roomId, name } = route.params;
  const username = useAuthStore((s) => s.user?.username);
  const room = useRoomStore((s) => s.myRooms.find((r) => r.roomId === roomId));
  const leaveRoom = useRoomStore((s) => s.leaveRoom);
  const { muteRoom, unmuteRoom } = useRoomStore();
  const isOnline = usePresenceStore((s) => s.isOnline);

  const [members, setMembers] = useState<UserSummary[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isMuting, setIsMuting] = useState(false);
  const [kickingUsername, setKickingUsername] = useState<string | null>(null);
  const [editName, setEditName] = useState(room?.name ?? name);
  const [editDescription, setEditDescription] = useState(room?.description ?? '');
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  const isAdmin = !!username && room?.createdBy === username;
  const isMuted = !!username && !!room?.mutedBy?.[username];

  const handleToggleMute = async () => {
    setIsMuting(true);
    try {
      if (isMuted) await unmuteRoom(roomId);
      else await muteRoom(roomId);
    } catch {
      Alert.alert('Could not update mute setting', 'Please try again.');
    } finally {
      setIsMuting(false);
    }
  };

  useEffect(() => {
    setIsLoadingMembers(true);
    roomsApi
      .getMembers(roomId)
      .then(setMembers)
      .catch(() => {})
      .finally(() => setIsLoadingMembers(false));
  }, [roomId]);

  // Kick/leave/join for this room pushed from someone else's action — refetch the member
  // list live rather than only reflecting it next time this screen happens to remount.
  useEffect(() => {
    return socketManager.onRoomEvent((event) => {
      if (event.roomId !== roomId) return;
      if (event.eventType === 'MEMBER_REMOVED' || event.eventType === 'MEMBER_LEFT' || event.eventType === 'MEMBER_JOINED') {
        roomsApi.getMembers(roomId).then(setMembers).catch(() => {});
      }
    });
  }, [roomId]);

  useEffect(() => {
    setEditName(room?.name ?? name);
    setEditDescription(room?.description ?? '');
  }, [room?.name, room?.description, name]);

  const saveDetails = async () => {
    if (!room) return;
    const trimmedName = editName.trim();
    const trimmedDescription = editDescription.trim();
    if (!trimmedName || (trimmedName === room.name && trimmedDescription === (room.description ?? ''))) return;
    setIsSavingDetails(true);
    try {
      const updated = await roomsApi.updateRoom(roomId, { name: trimmedName, description: trimmedDescription });
      useRoomStore.getState().applyRoomUpdate(updated);
    } catch {
      Alert.alert('Could not save', 'Please try again.');
      setEditName(room.name);
      setEditDescription(room.description ?? '');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const confirmKick = (member: UserSummary) => {
    const memberName = member.displayName || member.uniqueHandle || member.username;
    Alert.alert(`Remove ${memberName}?`, 'They will no longer be able to see or send messages in this group.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setKickingUsername(member.username);
          try {
            const updated = await roomsApi.kickMember(roomId, member.username);
            useRoomStore.getState().applyRoomUpdate(updated);
            setMembers((prev) => prev.filter((m) => m.username !== member.username));
          } catch (err: any) {
            Alert.alert('Could not remove member', err?.response?.data?.detail ?? 'Please try again.');
          } finally {
            setKickingUsername(null);
          }
        },
      },
    ]);
  };

  const confirmLeave = () => {
    Alert.alert('Leave group?', `You won't be able to send or receive messages in "${room?.name ?? name}" anymore.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          setIsLeaving(true);
          try {
            await leaveRoom(roomId);
            navigation.popToTop();
          } catch {
            Alert.alert('Could not leave group', 'Please try again.');
            setIsLeaving(false);
          }
        },
      },
    ]);
  };

  const copyRoomId = async () => {
    await Clipboard.setStringAsync(roomId);
    Alert.alert('Copied', 'Room ID copied — share it so others can join.');
  };

  const online = members.filter((m) => isOnline(m.username));
  const offline = members.filter((m) => !isOnline(m.username));

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} hitSlop={12}>
        <Feather name="chevron-left" size={22} color={tokens.text} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.hero}>
          <Avatar initials={initialsFor(room?.name ?? name)} color={tokens.accent} textColor={tokens.onAccent} size={88} />
          {isAdmin ? (
            <TextInput
              value={editName}
              onChangeText={setEditName}
              onBlur={saveDetails}
              maxLength={100}
              style={[styles.nameInput, { color: tokens.text }]}
            />
          ) : (
            <Text style={[styles.name, { color: tokens.text }]}>{room?.name ?? name}</Text>
          )}
          <Text style={{ color: tokens.textMuted, fontSize: 12.5 }}>
            {isLoadingMembers ? 'Group' : `Group · ${members.length} ${members.length === 1 ? 'member' : 'members'}`}
          </Text>
        </View>

        {isAdmin ? (
          <TextInput
            value={editDescription}
            onChangeText={setEditDescription}
            onBlur={saveDetails}
            placeholder="Add a group description"
            placeholderTextColor={tokens.textMuted}
            multiline
            maxLength={500}
            style={[styles.descriptionInput, { color: tokens.text, backgroundColor: tokens.surface, borderRadius: radii.control }]}
          />
        ) : room?.description ? (
          <Text style={[styles.description, { color: tokens.textMuted }]}>{room.description}</Text>
        ) : null}
        {isSavingDetails ? <ActivityIndicator size="small" color={tokens.textMuted} style={{ marginTop: 6 }} /> : null}

        <View style={{ gap: 8, marginTop: 18 }}>
          <TouchableOpacity
            style={[styles.actionRow, { backgroundColor: tokens.surface, borderRadius: radii.control }]}
            onPress={() => navigation.navigate('MediaGallery', { roomId, name })}
          >
            <Feather name="image" size={16} color={tokens.text} />
            <Text style={{ color: tokens.text, fontSize: 14, fontFamily: fonts.label, flex: 1 }}>Media, links and docs</Text>
            <Feather name="chevron-right" size={16} color={tokens.tabInactive} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionRow, { backgroundColor: tokens.surface, borderRadius: radii.control }]} onPress={copyRoomId}>
            <Feather name="hash" size={16} color={tokens.text} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: tokens.text, fontSize: 14, fontFamily: fonts.label }}>Room ID</Text>
              <Text style={{ color: tokens.textMuted, fontSize: 12 }} numberOfLines={1}>{roomId}</Text>
            </View>
            <Feather name="copy" size={15} color={tokens.tabInactive} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { backgroundColor: tokens.surface, borderRadius: radii.control }]}
            onPress={handleToggleMute}
            disabled={isMuting}
          >
            <Feather name={isMuted ? 'bell' : 'bell-off'} size={16} color={tokens.text} />
            {isMuting ? (
              <ActivityIndicator size="small" color={tokens.text} />
            ) : (
              <Text style={{ color: tokens.text, fontSize: 14, fontFamily: fonts.label, flex: 1 }}>
                {isMuted ? 'Unmute notifications' : 'Mute notifications'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>MEMBERS</Text>
        {isLoadingMembers ? (
          <ActivityIndicator color={tokens.accentStrong} style={{ marginTop: 12 }} />
        ) : (
          <>
            {online.length > 0 ? (
              <>
                <Text style={[styles.subLabel, { color: tokens.textMuted }]}>ONLINE — {online.length}</Text>
                {online.map((member) => (
                  <MemberRow
                    key={member.username}
                    member={member}
                    isAdmin={member.username === room?.createdBy}
                    canKick={isAdmin && member.username !== username}
                    isKicking={kickingUsername === member.username}
                    online
                    tokens={tokens}
                    onKick={() => confirmKick(member)}
                  />
                ))}
              </>
            ) : null}
            {offline.length > 0 ? (
              <>
                <Text style={[styles.subLabel, { color: tokens.textMuted }]}>OFFLINE — {offline.length}</Text>
                {offline.map((member) => (
                  <MemberRow
                    key={member.username}
                    member={member}
                    isAdmin={member.username === room?.createdBy}
                    canKick={isAdmin && member.username !== username}
                    isKicking={kickingUsername === member.username}
                    online={false}
                    tokens={tokens}
                    onKick={() => confirmKick(member)}
                  />
                ))}
              </>
            ) : null}
          </>
        )}

        <TouchableOpacity
          style={[styles.actionRow, { backgroundColor: tokens.surface, borderRadius: radii.control, marginTop: 20 }]}
          onPress={confirmLeave}
          disabled={isLeaving}
        >
          <Feather name="log-out" size={16} color="#DC5B4E" />
          {isLeaving ? (
            <ActivityIndicator size="small" color="#DC5B4E" />
          ) : (
            <Text style={{ color: '#DC5B4E', fontSize: 14, fontFamily: fonts.label, flex: 1 }}>Leave group</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  back: { paddingHorizontal: 16, paddingTop: 8 },
  body: { paddingHorizontal: 24, paddingBottom: 40 },
  hero: { alignItems: 'center', gap: 4, marginTop: 8, marginBottom: 4 },
  name: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.4, marginTop: 12, textAlign: 'center' },
  nameInput: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.4, marginTop: 12, textAlign: 'center', minWidth: 120 },
  description: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 10 },
  descriptionInput: { fontSize: 13, lineHeight: 19, marginTop: 10, padding: 12, minHeight: 44 },
  sectionLabel: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 1, marginTop: 24, marginBottom: 4 },
  subLabel: { fontFamily: fonts.label, fontSize: 10.5, letterSpacing: 0.5, marginTop: 12, marginBottom: 4 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
});
