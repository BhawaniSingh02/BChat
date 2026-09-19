import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Avatar from './Avatar';
import { useAuthStore } from '../store/authStore';
import { useDMStore } from '../store/dmStore';
import { usePresenceStore } from '../store/presenceStore';
import { useUserCacheStore } from '../store/userCacheStore';
import { ThemeTokens } from '../theme/tokens';
import { fonts } from '../theme/tokens';
import { DirectConversation, UserSummary } from '../types';

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

export default function DMRow({
  conversation,
  tokens,
  accentColor,
  onPress,
  onLongPress,
}: {
  conversation: DirectConversation;
  tokens: ThemeTokens;
  accentColor: string;
  onPress: (otherUser: UserSummary) => void;
  onLongPress?: () => void;
}) {
  const myUsername = useAuthStore((s) => s.user?.username);
  const getUser = useUserCacheStore((s) => s.getUser);
  const unread = useDMStore((s) => s.unreadCounts[conversation.id] ?? 0);
  const [otherUser, setOtherUser] = useState<UserSummary | null>(null);

  const otherUsername = conversation.participants.find((p) => p !== myUsername) ?? conversation.participants[0];
  const online = usePresenceStore((s) => s.isOnline(otherUsername));

  useEffect(() => {
    getUser(otherUsername).then(setOtherUser);
  }, [otherUsername, getUser]);

  const displayName = otherUser?.displayName || otherUser?.uniqueHandle || 'Loading…';

  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14 }}
      onPress={() => otherUser && onPress(otherUser)}
      onLongPress={onLongPress}
      disabled={!otherUser}
    >
      <Avatar
        initials={initialsFor(displayName)}
        color={accentColor}
        textColor={tokens.onAccent}
        imageUrl={otherUser?.avatarUrl}
        online={online}
        ringColor={tokens.background}
      />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text
            style={{
              color: tokens.text,
              fontFamily: unread > 0 ? fonts.display : fonts.heading,
              fontSize: 15,
              letterSpacing: -0.2,
              flexShrink: 1,
            }}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text style={{ color: unread > 0 ? accentColor : tokens.textMuted, fontSize: 12, fontFamily: fonts.label }}>
            {relativeTime(conversation.lastMessageAt)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
          <Text
            style={{ color: unread > 0 ? tokens.text : tokens.textMuted, fontSize: 13, flexShrink: 1, fontFamily: unread > 0 ? fonts.label : undefined }}
            numberOfLines={1}
          >
            {conversation.lastMessagePreview || 'Say hi 👋'}
          </Text>
          {unread > 0 ? (
            <View style={{ backgroundColor: accentColor, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
              <Text style={{ color: tokens.onAccent, fontFamily: fonts.heading, fontSize: 11 }}>{unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}
