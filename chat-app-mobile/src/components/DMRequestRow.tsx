import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Avatar from './Avatar';
import { useAuthStore } from '../store/authStore';
import { useUserCacheStore } from '../store/userCacheStore';
import { fonts, ThemeTokens } from '../theme/tokens';
import { DirectConversation, UserSummary } from '../types';

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

export default function DMRequestRow({
  conversation,
  tokens,
  accentColor,
  onAccept,
  onDecline,
}: {
  conversation: DirectConversation;
  tokens: ThemeTokens;
  accentColor: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const myUsername = useAuthStore((s) => s.user?.username);
  const getUser = useUserCacheStore((s) => s.getUser);
  const [otherUser, setOtherUser] = useState<UserSummary | null>(null);

  const otherUsername = conversation.participants.find((p) => p !== myUsername) ?? conversation.participants[0];

  useEffect(() => {
    getUser(otherUsername).then(setOtherUser);
  }, [otherUsername, getUser]);

  const displayName = otherUser?.displayName || otherUser?.uniqueHandle || otherUsername;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14 }}>
      <Avatar initials={initialsFor(displayName)} color={accentColor} textColor={tokens.onAccent} imageUrl={otherUser?.avatarUrl} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: tokens.text, fontFamily: fonts.heading, fontSize: 14.5 }} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={{ color: tokens.textMuted, fontSize: 12.5, marginTop: 2 }} numberOfLines={1}>
          {conversation.lastMessagePreview || 'Wants to message you'}
        </Text>
      </View>
      <TouchableOpacity onPress={onDecline} hitSlop={8} style={{ padding: 6 }}>
        <Feather name="x" size={18} color={tokens.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onAccept} hitSlop={8} style={{ padding: 6, backgroundColor: accentColor, borderRadius: 9 }}>
        <Feather name="check" size={16} color={tokens.onAccent} />
      </TouchableOpacity>
    </View>
  );
}
