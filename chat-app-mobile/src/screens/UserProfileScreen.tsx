import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';
import { usersApi } from '../api/users';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { useDMStore } from '../store/dmStore';
import { usePresenceStore } from '../store/presenceStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii } from '../theme/tokens';
import { UserSummary } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function formatLastSeen(iso?: string): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'last seen just now';
  if (mins < 60) return `last seen ${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `last seen ${hours}h ago`;
  return `last seen ${Math.round(hours / 24)}d ago`;
}

export default function UserProfileScreen({ route, navigation }: Props) {
  const { tokens } = useTheme();
  const { username, roomId, name } = route.params;
  const [profile, setProfile] = useState<UserSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isMuting, setIsMuting] = useState(false);
  const online = usePresenceStore((s) => s.isOnline(username));
  const blockedUsers = useAuthStore((s) => s.user?.blockedUsers ?? []);
  const myUsername = useAuthStore((s) => s.user?.username);
  const { blockUser, unblockUser } = useAuthStore();
  const isBlocked = blockedUsers.includes(username);
  const conversationId = roomId.startsWith('dm:') ? roomId.slice(3) : null;
  const conversation = useDMStore((s) => s.conversations.find((c) => c.id === conversationId));
  const { muteConversation, unmuteConversation } = useDMStore();
  const isMuted = !!myUsername && !!conversation?.mutedBy?.[myUsername];

  useEffect(() => {
    setIsLoading(true);
    setError(false);
    usersApi
      .getByUsername(username)
      .then(setProfile)
      .catch(() => setError(true))
      .finally(() => setIsLoading(false));
  }, [username]);

  const displayName = profile?.displayName || profile?.uniqueHandle || name;
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  const handleToggleBlock = () => {
    if (isBlocked) {
      Alert.alert(`Unblock ${displayName}?`, 'They will be able to message and call you again.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            setIsBlocking(true);
            try {
              await unblockUser(username);
            } finally {
              setIsBlocking(false);
            }
          },
        },
      ]);
      return;
    }
    Alert.alert(`Block ${displayName}?`, 'They will no longer be able to message or call you.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          setIsBlocking(true);
          try {
            await blockUser(username);
          } finally {
            setIsBlocking(false);
          }
        },
      },
    ]);
  };

  const handleToggleMute = async () => {
    if (!conversationId) return;
    setIsMuting(true);
    try {
      if (isMuted) await unmuteConversation(conversationId);
      else await muteConversation(conversationId);
    } catch {
      Alert.alert('Could not update mute setting', 'Please try again.');
    } finally {
      setIsMuting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} hitSlop={12}>
        <Feather name="chevron-left" size={22} color={tokens.text} />
      </TouchableOpacity>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={tokens.accentStrong} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={{ color: tokens.textMuted, fontSize: 13 }}>Could not load this profile.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Avatar
            initials={initialsFor(displayName)}
            color={tokens.accent}
            textColor={tokens.onAccent}
            size={96}
            imageUrl={profile?.avatarUrl}
            online={online}
            ringColor={tokens.background}
          />
          <Text style={[styles.name, { color: tokens.text }]}>{displayName}</Text>
          <Text style={{ color: tokens.textMuted, fontSize: 13 }}>@{profile?.uniqueHandle ?? username}</Text>
          <Text style={{ color: online ? tokens.accentStrong : tokens.textMuted, fontSize: 12.5, marginTop: 4 }}>
            {online ? 'online' : formatLastSeen(profile?.lastSeen)}
          </Text>

          {profile?.statusMessage ? (
            <Text style={{ color: tokens.accentStrong, fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 14 }}>
              {profile.statusMessage}
            </Text>
          ) : null}
          {profile?.bio ? (
            <Text style={{ color: tokens.text, fontSize: 13.5, textAlign: 'center', marginTop: 8, lineHeight: 19 }}>{profile.bio}</Text>
          ) : null}
          {memberSince ? (
            <Text style={{ color: tokens.textMuted, fontSize: 11.5, marginTop: 14 }}>Member since {memberSince}</Text>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionRow, { backgroundColor: tokens.surface, borderRadius: radii.control }]}
              onPress={() => navigation.navigate('MediaGallery', { roomId, name })}
            >
              <Feather name="image" size={16} color={tokens.text} />
              <Text style={{ color: tokens.text, fontSize: 14, fontFamily: fonts.label, flex: 1 }}>Media, links and docs</Text>
              <Feather name="chevron-right" size={16} color={tokens.tabInactive} />
            </TouchableOpacity>

            {conversationId ? (
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
            ) : null}

            <TouchableOpacity
              style={[styles.actionRow, { backgroundColor: tokens.surface, borderRadius: radii.control }]}
              onPress={handleToggleBlock}
              disabled={isBlocking}
            >
              <Feather name="slash" size={16} color="#DC5B4E" />
              {isBlocking ? (
                <ActivityIndicator size="small" color="#DC5B4E" />
              ) : (
                <Text style={{ color: '#DC5B4E', fontSize: 14, fontFamily: fonts.label, flex: 1 }}>
                  {isBlocked ? `Unblock ${displayName}` : `Block ${displayName}`}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  back: { paddingHorizontal: 16, paddingTop: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { alignItems: 'center', paddingHorizontal: 32, paddingBottom: 40, paddingTop: 8 },
  name: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.4, marginTop: 14 },
  actions: { width: '100%', gap: 8, marginTop: 26 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
});
