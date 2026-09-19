import { Feather } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Message } from '../types';
import { fonts, ThemeTokens } from '../theme/tokens';
import { formatDuration } from './VoiceRecorder';

/** Shared-image bubble: shows a placeholder + spinner until the image finishes loading. */
function ChatImage({ uri, tokens }: { uri: string; tokens: ThemeTokens }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <View style={{ width: 200, height: 200, borderRadius: 12, backgroundColor: tokens.surface2, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="image" size={20} color={tokens.textMuted} />
        <Text style={{ color: tokens.textMuted, fontSize: 11, marginTop: 4 }}>Couldn't load image</Text>
      </View>
    );
  }

  return (
    <View style={{ width: 200, height: 200, borderRadius: 12, backgroundColor: tokens.surface2, overflow: 'hidden' }}>
      {!loaded ? (
        <View style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={tokens.textMuted} />
        </View>
      ) : null}
      <Image
        source={{ uri }}
        style={{ width: 200, height: 200, opacity: loaded ? 1 : 0 }}
        resizeMode="cover"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
    </View>
  );
}

function fileNameFromUrl(url: string): string {
  const last = url.split('/').pop() ?? 'file';
  return decodeURIComponent(last.split('?')[0]);
}

// Only one voice message should play at a time — starting a new one pauses
// whatever was previously playing, matching normal chat-app expectations.
let activeAudioStop: (() => void) | null = null;

const PLAYBACK_RATES = [1, 1.5, 2];

function AudioPlayer({
  url,
  mine,
  tokens,
  waveform,
  durationSeconds,
}: {
  url: string;
  mine: boolean;
  tokens: ThemeTokens;
  waveform?: number[];
  durationSeconds?: number;
}) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const [rateIndex, setRateIndex] = useState(0);
  const rate = PLAYBACK_RATES[rateIndex];

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
      if (activeAudioStop === pause) activeAudioStop = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setPositionMillis(status.positionMillis);
    if (status.durationMillis) setDurationMillis(status.durationMillis);
    setIsPlaying(status.isPlaying);
    if (status.didJustFinish) {
      setIsPlaying(false);
      setPositionMillis(0);
    }
  };

  const pause = () => {
    soundRef.current?.pauseAsync();
  };

  const togglePlay = async () => {
    if (!soundRef.current) {
      setIsLoading(true);
      try {
        activeAudioStop?.();
        activeAudioStop = pause;
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true, rate, shouldCorrectPitch: true },
          onStatusUpdate,
        );
        soundRef.current = sound;
      } catch {
        // Playback failed to load — nothing to recover, user can retry the tap.
      } finally {
        setIsLoading(false);
      }
      return;
    }
    if (isPlaying) {
      pause();
    } else {
      activeAudioStop?.();
      activeAudioStop = pause;
      soundRef.current.playAsync();
    }
  };

  // Cycles 1x → 1.5x → 2x → back to 1x, applying instantly to whatever's already loaded.
  const cycleRate = () => {
    const nextIndex = (rateIndex + 1) % PLAYBACK_RATES.length;
    setRateIndex(nextIndex);
    soundRef.current?.setRateAsync(PLAYBACK_RATES[nextIndex], true);
  };

  // Persisted duration is authoritative and available instantly; the loaded Sound's own
  // duration (once known) takes over for accurate scrubbing bounds.
  const effectiveDurationMillis = durationMillis || (durationSeconds ? durationSeconds * 1000 : 0);

  const seekToLocationX = (locationX: number) => {
    if (!soundRef.current || !effectiveDurationMillis || !trackWidth) return;
    const ratio = Math.max(0, Math.min(1, locationX / trackWidth));
    const target = ratio * effectiveDurationMillis;
    setPositionMillis(target);
    soundRef.current.setPositionAsync(target);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => seekToLocationX(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => seekToLocationX(evt.nativeEvent.locationX),
    }),
  ).current;

  const progress = effectiveDurationMillis > 0 ? positionMillis / effectiveDurationMillis : 0;
  const iconColor = tokens.onAccent;
  const trackColor = mine ? 'rgba(255,255,255,0.3)' : tokens.surface2;
  const fillColor = mine ? tokens.onAccent : tokens.accent;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, minWidth: 190 }}>
      <TouchableOpacity
        onPress={togglePlay}
        disabled={isLoading}
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: mine ? 'rgba(255,255,255,0.2)' : tokens.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <Feather name={isPlaying ? 'pause' : 'play'} size={15} color={iconColor} />
        )}
      </TouchableOpacity>
      <View style={{ flex: 1, gap: 3 }}>
        {waveform && waveform.length > 0 ? (
          <View
            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
            {...panResponder.panHandlers}
            style={{ height: 16, flexDirection: 'row', alignItems: 'center', gap: 1.5 }}
          >
            {waveform.map((v, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: Math.max(3, Math.round((v / 100) * 14)),
                  borderRadius: 2,
                  backgroundColor: i / waveform.length <= progress ? fillColor : trackColor,
                }}
              />
            ))}
          </View>
        ) : (
          <View
            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
            {...panResponder.panHandlers}
            style={{ height: 16, justifyContent: 'center' }}
          >
            <View style={{ height: 3, borderRadius: 2, backgroundColor: trackColor }}>
              <View style={{ height: 3, borderRadius: 2, backgroundColor: fillColor, width: `${progress * 100}%` }} />
            </View>
          </View>
        )}
        <Text style={{ color: mine ? tokens.onAccent : tokens.textMuted, opacity: mine ? 0.85 : 1, fontSize: 10.5 }}>
          {formatDuration(Math.floor((effectiveDurationMillis || positionMillis) / 1000))}
        </Text>
      </View>
      <TouchableOpacity
        onPress={cycleRate}
        hitSlop={8}
        style={{
          paddingHorizontal: 7,
          paddingVertical: 3,
          borderRadius: 9,
          backgroundColor: mine ? 'rgba(255,255,255,0.2)' : tokens.surface2,
        }}
      >
        <Text style={{ color: mine ? tokens.onAccent : tokens.text, fontSize: 11, fontFamily: fonts.label }}>
          {rate}x
        </Text>
      </TouchableOpacity>
    </View>
  );
}

interface Props {
  item: Message;
  mine: boolean;
  tokens: ThemeTokens;
  onPressImage: (url: string) => void;
  onPressFile: (item: Message) => void;
  onJumpToReply?: () => void;
}

function ReplyQuote({ item, mine, tokens, onJumpToReply }: { item: Message; mine: boolean; tokens: ThemeTokens; onJumpToReply?: () => void }) {
  return (
    <TouchableOpacity
      disabled={!onJumpToReply}
      onPress={onJumpToReply}
      style={{
        flexDirection: 'row',
        alignItems: 'stretch',
        backgroundColor: mine ? 'rgba(0,0,0,0.16)' : tokens.surface2,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 6,
      }}
    >
      <View style={{ width: 3, backgroundColor: mine ? 'rgba(255,255,255,0.85)' : tokens.accent }} />
      <View style={{ flex: 1, paddingVertical: 5, paddingHorizontal: 8 }}>
        <Text style={{ color: mine ? '#FFFFFF' : tokens.accentStrong, fontSize: 12, fontFamily: fonts.heading }} numberOfLines={1}>
          {item.replyToSender}
        </Text>
        <Text style={{ color: mine ? 'rgba(255,255,255,0.85)' : tokens.textMuted, fontSize: 12.5 }} numberOfLines={1}>
          {item.replyToSnippet}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function hasReactions(item: Message): boolean {
  return !!item.reactions && Object.values(item.reactions).some((users) => users.length > 0);
}

/**
 * Floating badge meant to be rendered by the parent, absolutely positioned so it
 * overlaps the bottom edge of the bubble (WhatsApp-style) instead of sitting inside
 * the bubble's own text flow.
 */
export function ReactionBadge({ reactions, tokens, myUsername, onReact }: {
  reactions: Record<string, string[]>;
  tokens: ThemeTokens;
  myUsername?: string;
  onReact?: (emoji: string) => void;
}) {
  const entries = Object.entries(reactions).filter(([, users]) => users.length > 0);
  if (entries.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {entries.map(([emoji, users]) => {
        const isMine = !!myUsername && users.includes(myUsername);
        return (
          <TouchableOpacity
            key={emoji}
            disabled={!onReact}
            onPress={() => onReact?.(emoji)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 2,
              paddingVertical: 2.5,
              paddingHorizontal: 6,
              borderRadius: 12,
              backgroundColor: isMine ? tokens.accent : tokens.surface,
              borderWidth: 1.5,
              borderColor: tokens.background,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 2,
              shadowOffset: { width: 0, height: 1 },
              elevation: 2,
            }}
          >
            <Text style={{ fontSize: 12 }}>{emoji}</Text>
            {users.length > 1 ? (
              <Text style={{ fontSize: 10.5, fontWeight: '600', color: isMine ? tokens.onAccent : tokens.textMuted }}>
                {users.length}
              </Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function MessageBubbleContent({ item, mine, tokens, onPressImage, onPressFile, onJumpToReply }: Props) {
  const textColor = mine ? tokens.onAccent : tokens.text;

  if (item.deleted) {
    return <Text style={{ color: mine ? tokens.onAccent : tokens.textMuted, fontSize: 14, fontStyle: 'italic' }}>This message was deleted</Text>;
  }

  let content: React.ReactNode;

  if (item.messageType === 'IMAGE' && item.fileUrl) {
    content = (
      <TouchableOpacity onPress={() => onPressImage(item.fileUrl!)}>
        <ChatImage uri={item.fileUrl} tokens={tokens} />
        {item.content ? <Text style={{ color: textColor, fontSize: 14, marginTop: 6 }}>{item.content}</Text> : null}
      </TouchableOpacity>
    );
  } else if (item.messageType === 'AUDIO' && item.fileUrl) {
    content = <AudioPlayer url={item.fileUrl} mine={mine} tokens={tokens} waveform={item.waveform} durationSeconds={item.durationSeconds} />;
  } else if (item.messageType === 'VIDEO' && item.fileUrl) {
    content = (
      <TouchableOpacity onPress={() => onPressFile(item)}>
        <View style={{ width: 200, height: 130, borderRadius: 12, backgroundColor: '#0A0D0F', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="play" size={18} color="#0A0D0F" style={{ marginLeft: 2 }} />
          </View>
        </View>
        {item.content ? <Text style={{ color: textColor, fontSize: 14, marginTop: 6 }}>{item.content}</Text> : null}
      </TouchableOpacity>
    );
  } else if (item.messageType === 'FILE' && item.fileUrl) {
    const filename = fileNameFromUrl(item.fileUrl);
    content = (
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}
        onPress={() => onPressFile(item)}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            backgroundColor: mine ? 'rgba(255,255,255,0.2)' : tokens.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather name="file-text" size={15} color={tokens.onAccent} />
        </View>
        <Text style={{ color: textColor, fontSize: 13.5, flexShrink: 1 }} numberOfLines={1}>
          {filename}
        </Text>
      </TouchableOpacity>
    );
  } else {
    content = <Text style={{ color: textColor, fontSize: 14, lineHeight: 20 }}>{item.content}</Text>;
  }

  return (
    <>
      {item.forwardedFrom ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <Feather name="corner-up-right" size={11} color={mine ? tokens.onAccent : tokens.textMuted} style={{ opacity: 0.7 }} />
          <Text style={{ color: mine ? tokens.onAccent : tokens.textMuted, opacity: 0.7, fontSize: 11.5, fontStyle: 'italic' }}>
            Forwarded
          </Text>
        </View>
      ) : null}
      {item.replyToId ? <ReplyQuote item={item} mine={mine} tokens={tokens} onJumpToReply={onJumpToReply} /> : null}
      {content}
      {item.edited ? (
        <Text style={{ color: mine ? tokens.onAccent : tokens.textMuted, opacity: 0.7, fontSize: 10.5, marginTop: 2 }}>edited</Text>
      ) : null}
    </>
  );
}
