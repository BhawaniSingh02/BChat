import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Avatar from './Avatar';
import { useAuthStore } from '../store/authStore';
import { useStoryStore } from '../store/storyStore';
import { useUserCacheStore } from '../store/userCacheStore';
import { useTheme } from '../theme/ThemeContext';
import { avatarPalette, fonts } from '../theme/tokens';
import { RootStackParamList } from '../navigation/types';
import { Story } from '../types';

const RING_SIZE = 60;
const STROKE_WIDTH = 2.5;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP_DEG = 6;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

/**
 * One arc per story in the group (Instagram/WhatsApp-style segmented ring),
 * filled teal while unviewed and gray once seen — instead of a single solid
 * ring regardless of how many stories are in the group.
 */
function SegmentedRing({ stories }: { stories: Story[] }) {
  const n = stories.length;
  if (n === 0) return null;
  const segDeg = 360 / n;
  const arcDeg = Math.max(0, segDeg - GAP_DEG);
  const dashLength = (arcDeg / 360) * CIRCUMFERENCE;

  return (
    <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: 'absolute' }}>
      {stories.map((s, i) => (
        <Circle
          key={s.id}
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke={s.viewedByMe ? '#9CA3AF' : '#14B8A6'}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={`${dashLength} ${CIRCUMFERENCE - dashLength}`}
          strokeLinecap="round"
          fill="none"
          rotation={i * segDeg - 90}
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      ))}
    </Svg>
  );
}

export default function StoriesBar() {
  const { tokens } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const myUsername = useAuthStore((s) => s.user?.username);
  const groups = useStoryStore((s) => s.groups);
  const fetchFeed = useStoryStore((s) => s.fetchFeed);
  const getUser = useUserCacheStore((s) => s.getUser);
  const users = useUserCacheStore((s) => s.users);

  // Refetch every time the Chats tab regains focus (not just on first mount) so a
  // story posted from another client (or another session) shows up without a full
  // app reload — same pattern ChatsScreen itself uses for rooms/conversations.
  useFocusEffect(
    useCallback(() => {
      void fetchFeed();
    }, [fetchFeed]),
  );

  useEffect(() => {
    groups.forEach((g) => {
      if (g.authorId !== myUsername) void getUser(g.authorId);
    });
  }, [groups, myUsername, getUser]);

  const ownGroup = useMemo(() => groups.find((g) => g.authorId === myUsername), [groups, myUsername]);
  const otherGroups = useMemo(() => groups.filter((g) => g.authorId !== myUsername), [groups, myUsername]);

  const openViewer = (authorId: string) => navigation.navigate('StoryViewer', { startAuthorId: authorId });
  const openComposer = () => navigation.navigate('StoryComposer');

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: tokens.border, paddingVertical: 10 }}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 14 }}
        data={otherGroups}
        keyExtractor={(g) => g.authorId}
        ListHeaderComponent={
          <TouchableOpacity
            onPress={() => (ownGroup ? openViewer(myUsername!) : openComposer())}
            style={{ width: 64, alignItems: 'center', gap: 4 }}
          >
            <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
              {ownGroup ? <SegmentedRing stories={ownGroup.stories} /> : null}
              <Avatar
                initials="You"
                color={avatarPalette[0]}
                textColor={tokens.onAccent}
                imageUrl={users[myUsername ?? '']?.avatarUrl}
                size={RING_SIZE - 8}
                circle
              />
              <TouchableOpacity
                onPress={openComposer}
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: tokens.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: tokens.background,
                }}
              >
                <Feather name="plus" size={12} color={tokens.onAccent} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: tokens.textMuted, fontSize: 11, fontFamily: fonts.label }} numberOfLines={1}>
              Your story
            </Text>
          </TouchableOpacity>
        }
        renderItem={({ item: g }) => {
          const u = users[g.authorId];
          const label = u?.displayName || u?.uniqueHandle || '…';
          return (
            <TouchableOpacity onPress={() => openViewer(g.authorId)} style={{ width: 64, alignItems: 'center', gap: 4 }}>
              <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
                <SegmentedRing stories={g.stories} />
                <Avatar
                  initials={initialsFor(label)}
                  color={avatarPalette[1]}
                  textColor="#FFFFFF"
                  imageUrl={u?.avatarUrl}
                  size={RING_SIZE - 8}
                  circle
                />
              </View>
              <Text style={{ color: tokens.textMuted, fontSize: 11, fontFamily: fonts.label }} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
