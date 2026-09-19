import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AVPlaybackStatus, ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';
import { RootStackParamList } from '../navigation/types';
import { storiesApi } from '../api/stories';
import { useAuthStore } from '../store/authStore';
import { useStoryStore } from '../store/storyStore';
import { useUserCacheStore } from '../store/userCacheStore';
import { avatarPalette, fonts } from '../theme/tokens';
import { gradientFor } from './StoryComposerScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryViewer'>;

const STORY_DURATION = 5000;
const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👍'];

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export default function StoryViewerScreen({ route, navigation }: Props) {
  const { startAuthorId } = route.params;
  const groups = useStoryStore((s) => s.groups);
  const markViewed = useStoryStore((s) => s.markViewed);
  const reactToStory = useStoryStore((s) => s.reactToStory);
  const deleteStory = useStoryStore((s) => s.deleteStory);
  const myUsername = useAuthStore((s) => s.user?.username);
  const getUser = useUserCacheStore((s) => s.getUser);
  const users = useUserCacheStore((s) => s.users);

  const [groupIndex, setGroupIndex] = useState(() => Math.max(0, groups.findIndex((g) => g.authorId === startAuthorId)));
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [manualPaused, setManualPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyFocused, setReplyFocused] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [reacted, setReacted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<string[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  // Gate the progress ticker/auto-advance on the media actually being ready —
  // on a slow connection the bar must not run (or skip to the next story)
  // before the image/video has loaded, matching WhatsApp/Instagram behavior.
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);

  const elapsedRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];
  const isOwn = story?.authorId === myUsername;
  const isPaused = replyFocused || manualPaused || showViewers || confirmDelete;

  useEffect(() => {
    if (story && story.authorId !== myUsername) void getUser(story.authorId);
  }, [story, myUsername, getUser]);

  const goNext = useCallback(() => {
    const g = groups[groupIndex];
    if (g && storyIndex < g.stories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((i) => i + 1);
      setStoryIndex(0);
    } else {
      navigation.goBack();
    }
  }, [groups, groupIndex, storyIndex, navigation]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else if (groupIndex > 0) {
      const prev = groups[groupIndex - 1];
      setGroupIndex((i) => i - 1);
      setStoryIndex(Math.max(0, prev.stories.length - 1));
    }
  }, [storyIndex, groupIndex, groups]);

  // Mark viewed (never your own).
  useEffect(() => {
    if (story && story.authorId !== myUsername && !story.viewedByMe) {
      void markViewed(story.id);
    }
  }, [story, myUsername, markViewed]);

  // Reset transient state on story change.
  useEffect(() => {
    setReplyText('');
    setSent(false);
    setReacted(false);
    setManualPaused(false);
    setShowViewers(false);
    setConfirmDelete(false);
    setProgress(0);
    setMediaFailed(false);
    elapsedRef.current = 0;
  }, [groupIndex, storyIndex]);

  // Media-loading state depends on the story's type — TEXT never "loads",
  // IMAGE/VIDEO start pending until their load callback fires below.
  useEffect(() => {
    setMediaLoading(story?.type === 'IMAGE' || story?.type === 'VIDEO');
  }, [groupIndex, storyIndex, story?.type]);

  // A story that failed to load entirely (broken URL, offline) shouldn't strand
  // the viewer — skip it after a brief pause instead of hanging forever.
  useEffect(() => {
    if (!mediaFailed) return;
    const t = setTimeout(goNext, 1500);
    return () => clearTimeout(t);
  }, [mediaFailed, goNext]);

  // TEXT/IMAGE progress ticker — video stories drive their own progress from playback status.
  useEffect(() => {
    if (!story || story.type === 'VIDEO') return;
    if (tickRef.current) clearInterval(tickRef.current);
    if (isPaused || mediaLoading) return;
    tickRef.current = setInterval(() => {
      elapsedRef.current += 50;
      const pct = Math.min(100, (elapsedRef.current / STORY_DURATION) * 100);
      setProgress(pct);
      if (elapsedRef.current >= STORY_DURATION) {
        if (tickRef.current) clearInterval(tickRef.current);
        goNext();
      }
    }, 50);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [story, isPaused, mediaLoading, goNext, groupIndex, storyIndex]);

  const onVideoStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setMediaLoading(status.isBuffering);
    if (status.durationMillis) setProgress((status.positionMillis / status.durationMillis) * 100);
    if (status.didJustFinish) goNext();
  };

  const onVideoError = () => {
    setMediaLoading(false);
    setMediaFailed(true);
  };

  const handleQuickReact = async (emoji: string) => {
    if (!story) return;
    await reactToStory(story.id, emoji);
    setReacted(true);
    setTimeout(() => setReacted(false), 1500);
  };

  const handleReply = async () => {
    const text = replyText.trim();
    if (!text || sending || !story) return;
    setSending(true);
    try {
      await storiesApi.reply(story.id, text);
      setReplyText('');
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    } catch {
      /* user can retry */
    } finally {
      setSending(false);
    }
  };

  const openViewers = async () => {
    if (!story) return;
    setShowViewers(true);
    setViewersLoading(true);
    try {
      const list = await storiesApi.getViewers(story.id);
      setViewers(list);
      list.forEach((u) => void getUser(u));
    } catch {
      setViewers([]);
    } finally {
      setViewersLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!story || !group) return;
    const wasOnly = group.stories.length <= 1;
    setConfirmDelete(false);
    await deleteStory(story.id);
    if (wasOnly) navigation.goBack();
    else setStoryIndex((i) => Math.max(0, i - 1));
  };

  const confirmDeleteAlert = () => {
    Alert.alert('Delete story?', 'This story will be removed for everyone who can see it.', [
      { text: 'Cancel', style: 'cancel', onPress: () => setConfirmDelete(false) },
      { text: 'Delete', style: 'destructive', onPress: handleDelete },
    ]);
    setConfirmDelete(true);
  };

  if (!group || !story) return null;

  const u = users[story.authorId];
  const name = isOwn ? 'Your story' : u?.displayName || u?.uniqueHandle || 'Someone';
  const atFirst = groupIndex === 0 && storyIndex === 0;

  return (
    <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe}>
          {/* Progress bars */}
          <View style={styles.progressRow}>
            {group.stories.map((s, i) => (
              <View key={s.id} style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${i < storyIndex ? 100 : i === storyIndex ? progress : 0}%` },
                  ]}
                />
              </View>
            ))}
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Avatar
              initials={initialsFor(name)}
              color={avatarPalette[0]}
              imageUrl={u?.avatarUrl}
              size={32}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
              <Text style={styles.headerTime}>{relativeTime(story.createdAt)}</Text>
            </View>
            <TouchableOpacity onPress={() => setManualPaused((p) => !p)} hitSlop={10}>
              <Feather name={manualPaused ? 'play' : 'pause'} size={18} color="#FFFFFF" />
            </TouchableOpacity>
            {isOwn ? (
              <TouchableOpacity onPress={confirmDeleteAlert} hitSlop={10}>
                <Feather name="trash-2" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
              <Feather name="x" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {story.type === 'TEXT' ? (
              <LinearGradient colors={gradientFor(story.backgroundColor)} style={styles.textCanvas}>
                <Text style={styles.textContent}>{story.content}</Text>
              </LinearGradient>
            ) : story.type === 'VIDEO' ? (
              !mediaFailed && (
                <Video
                  source={{ uri: story.mediaUrl }}
                  style={StyleSheet.absoluteFill}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={!isPaused}
                  // Default is ~500ms, which makes the progress bar visibly jump between updates —
                  // web's <video> drives progress off native onTimeUpdate (several times/sec).
                  progressUpdateIntervalMillis={100}
                  onPlaybackStatusUpdate={onVideoStatus}
                  onError={onVideoError}
                />
              )
            ) : (
              !mediaFailed && (
                <Image
                  source={{ uri: story.mediaUrl }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="contain"
                  onLoad={() => setMediaLoading(false)}
                  onError={() => { setMediaLoading(false); setMediaFailed(true); }}
                />
              )
            )}
            {story.type !== 'TEXT' && story.content && !mediaFailed ? (
              <Text style={styles.caption}>{story.content}</Text>
            ) : null}
            {story.type !== 'TEXT' && mediaLoading && !mediaFailed ? (
              <View style={styles.mediaLoading} pointerEvents="none">
                <ActivityIndicator color="#FFFFFF" size="large" />
              </View>
            ) : null}
            {mediaFailed ? (
              <View style={styles.mediaLoading} pointerEvents="none">
                <Text style={styles.mediaFailedText}>Couldn&apos;t load this story</Text>
              </View>
            ) : null}

            {/* Tap zones */}
            <TouchableOpacity
              style={[styles.tapZone, { left: 0, width: '33%' }]}
              activeOpacity={1}
              onPress={goPrev}
              disabled={atFirst}
            />
            <TouchableOpacity style={[styles.tapZone, { right: 0, width: '67%' }]} activeOpacity={1} onPress={goNext} />
          </View>

          {/* Bottom bar */}
          {isOwn ? (
            <TouchableOpacity style={styles.seenCount} onPress={openViewers}>
              <Feather name="eye" size={14} color="#FFFFFF" />
              <Text style={styles.seenCountText}>
                {story.viewerCount} {story.viewerCount === 1 ? 'view' : 'views'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.bottomBar}>
              {sent ? <Text style={styles.confirmText}>Reply sent ✓</Text> : null}
              {reacted ? <Text style={styles.confirmText}>Reaction sent ✓</Text> : null}
              <View style={styles.quickReactRow}>
                {QUICK_REACTIONS.map((emoji) => (
                  <TouchableOpacity key={emoji} onPress={() => handleQuickReact(emoji)}>
                    <Text style={[styles.quickReactEmoji, story.myReaction === emoji && styles.quickReactActive]}>
                      {emoji}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.replyRow}>
                <TextInput
                  value={replyText}
                  onChangeText={setReplyText}
                  onFocus={() => setReplyFocused(true)}
                  onBlur={() => setReplyFocused(false)}
                  placeholder={`Reply to ${name}…`}
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  style={styles.replyInput}
                />
                <TouchableOpacity
                  onPress={handleReply}
                  disabled={!replyText.trim() || sending}
                  style={[styles.sendBtn, (!replyText.trim() || sending) && { opacity: 0.4 }]}
                >
                  <Feather name="send" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Viewers sheet */}
          <Modal visible={showViewers} transparent animationType="slide" onRequestClose={() => setShowViewers(false)}>
            <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setShowViewers(false)}>
              <View style={styles.sheet}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Viewed by {viewers.length}</Text>
                  <TouchableOpacity onPress={() => setShowViewers(false)} hitSlop={10}>
                    <Feather name="chevron-down" size={20} color="#F3F5F6" />
                  </TouchableOpacity>
                </View>
                {viewersLoading ? (
                  <ActivityIndicator style={{ marginVertical: 20 }} color="#9CA3AF" />
                ) : viewers.length === 0 ? (
                  <Text style={styles.emptyViewers}>No views yet</Text>
                ) : (
                  <FlatList
                    data={viewers}
                    keyExtractor={(u) => u}
                    renderItem={({ item }) => {
                      const vu = users[item];
                      const vname = vu?.displayName || vu?.uniqueHandle || '…';
                      return (
                        <View style={styles.viewerRow}>
                          <Avatar initials={initialsFor(vname)} color={avatarPalette[2]} imageUrl={vu?.avatarUrl} size={32} />
                          <Text style={styles.viewerName}>{vname}</Text>
                        </View>
                      );
                    }}
                  />
                )}
              </View>
            </TouchableOpacity>
          </Modal>
        </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000' },
  safe: { flex: 1 },
  progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 12, paddingTop: 8 },
  progressTrack: { flex: 1, height: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  headerName: { color: '#FFFFFF', fontFamily: fonts.heading, fontSize: 14 },
  headerTime: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  content: { flex: 1, backgroundColor: '#000000' },
  mediaLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  mediaFailedText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  textCanvas: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  textContent: { color: '#FFFFFF', fontFamily: fonts.heading, fontSize: 22, textAlign: 'center', lineHeight: 30 },
  caption: {
    position: 'absolute',
    bottom: 70,
    left: 16,
    right: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 13,
  },
  tapZone: { position: 'absolute', top: 0, bottom: 90 },
  seenCount: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  seenCountText: { color: '#FFFFFF', fontSize: 13, fontFamily: fonts.label },
  bottomBar: { paddingHorizontal: 12, paddingBottom: 14 },
  confirmText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, textAlign: 'center', marginBottom: 6 },
  quickReactRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 8 },
  quickReactEmoji: { fontSize: 26 },
  quickReactActive: { transform: [{ scale: 1.2 }] },
  replyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#14B8A6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { maxHeight: '65%', backgroundColor: '#1A242B', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 20 },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2A3339',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sheetTitle: { color: '#F3F5F6', fontFamily: fonts.heading, fontSize: 14 },
  emptyViewers: { color: '#8B9296', textAlign: 'center', paddingVertical: 24, fontSize: 13 },
  viewerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  viewerName: { color: '#F3F5F6', fontSize: 13 },
});
