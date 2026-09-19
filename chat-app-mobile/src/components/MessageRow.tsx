import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MessageBubbleContent, { ReactionBadge, hasReactions } from './MessageBubbleContent';
import { Message } from '../types';
import { fonts, radii, ThemeTokens } from '../theme/tokens';

const SWIPE_TRIGGER_DISTANCE = 56;
const SWIPE_MAX_DISTANCE = 74;
const READ_TICK_COLOR = '#38BDF8';

interface Props {
  item: Message;
  mine: boolean;
  read: boolean;
  highlighted?: boolean;
  tokens: ThemeTokens;
  myUsername?: string;
  formatTime: (iso: string) => string;
  onPressImage: (url: string) => void;
  onPressFile: (item: Message) => void;
  // These take the item/id explicitly (rather than being pre-bound per-row closures) so the
  // FlatList's renderItem can pass down stable, useCallback'd references from the screen —
  // required for React.memo below to actually skip re-rendering unaffected rows.
  onLongPress: (item: Message) => void;
  onReply: (item: Message) => void;
  onReact: (item: Message, emoji: string) => void;
  onJumpToReply?: (replyToId: string) => void;
  onRetry?: (item: Message) => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

function MessageRow({
  item,
  mine,
  read,
  highlighted,
  tokens,
  myUsername,
  formatTime,
  onPressImage,
  onPressFile,
  onLongPress,
  onReply,
  onReact,
  onJumpToReply,
  onRetry,
  selectionMode,
  selected,
  onToggleSelect,
}: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const highlightOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (highlighted) {
      highlightOpacity.setValue(0.35);
      Animated.timing(highlightOpacity, { toValue: 0, duration: 1200, useNativeDriver: true }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlighted]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      // Only claim the gesture once a clearly horizontal, rightward drag is underway —
      // otherwise this would fight the FlatList's own vertical scroll responder.
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        !item.deleted && gesture.dx > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_evt, gesture) => {
        translateX.setValue(Math.max(0, Math.min(gesture.dx, SWIPE_MAX_DISTANCE)));
      },
      onPanResponderRelease: (_evt, gesture) => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
        if (gesture.dx >= SWIPE_TRIGGER_DISTANCE) onReply(item);
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;

  const showReactions = !item.deleted && hasReactions(item);
  const tickColor = read ? READ_TICK_COLOR : tokens.onAccent;
  const isStarred = !!myUsername && !!item.starred?.includes(myUsername);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {selectionMode ? (
        <TouchableOpacity onPress={() => onToggleSelect?.(item.id)} hitSlop={8} style={styles.checkbox}>
          <Feather
            name={selected ? 'check-circle' : 'circle'}
            size={20}
            color={selected ? tokens.accentStrong : tokens.textMuted}
          />
        </TouchableOpacity>
      ) : null}
      <View style={{ flex: 1 }}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 6,
            top: '50%',
            marginTop: -13,
            opacity: translateX.interpolate({ inputRange: [0, SWIPE_TRIGGER_DISTANCE], outputRange: [0, 1], extrapolate: 'clamp' }),
            transform: [
              { scale: translateX.interpolate({ inputRange: [0, SWIPE_TRIGGER_DISTANCE], outputRange: [0.5, 1], extrapolate: 'clamp' }) },
            ],
          }}
        >
          <View style={[styles.replyIconWrap, { backgroundColor: tokens.surface2 }]}>
            <Feather name="corner-up-left" size={13} color={tokens.accentStrong} />
          </View>
        </Animated.View>

        <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX }] }}>
          <TouchableOpacity
            activeOpacity={0.85}
            delayLongPress={280}
            disabled={item.deleted}
            onPress={selectionMode ? () => onToggleSelect?.(item.id) : undefined}
            onLongPress={() => (selectionMode ? onToggleSelect?.(item.id) : onLongPress(item))}
            style={[
              styles.bubble,
              {
                alignSelf: mine ? 'flex-end' : 'flex-start',
                backgroundColor: mine ? tokens.accent : tokens.surface,
                borderRadius: radii.bubble,
                marginBottom: showReactions ? 12 : 0,
              },
            ]}
          >
            {!mine ? (
              <Text style={{ color: tokens.accentStrong, fontSize: 11, fontFamily: fonts.label, marginBottom: 2 }}>
                {item.senderName}
              </Text>
            ) : null}
            <MessageBubbleContent
              item={item}
              mine={mine}
              tokens={tokens}
              onPressImage={(url) => (selectionMode ? onToggleSelect?.(item.id) : onPressImage(url))}
              onPressFile={(msg) => (selectionMode ? onToggleSelect?.(item.id) : onPressFile(msg))}
              onJumpToReply={() => item.replyToId && onJumpToReply?.(item.replyToId)}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: tokens.accentStrong, borderRadius: radii.bubble, opacity: highlightOpacity },
              ]}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 3, marginTop: 4 }}>
              {isStarred ? (
                <Feather name="star" size={10} color={mine ? tokens.onAccent : tokens.accentStrong} style={{ opacity: mine ? 0.85 : 1 }} />
              ) : null}
              {item.status === 'failed' ? (
                <TouchableOpacity
                  onPress={() => onRetry?.(item)}
                  hitSlop={8}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
                >
                  <Feather name="alert-circle" size={11} color="#FFD1CC" />
                  <Text style={{ color: '#FFD1CC', fontSize: 10, fontFamily: fonts.label }}>Tap to retry</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <Text style={{ color: mine ? tokens.onAccent : tokens.textMuted, opacity: mine ? 0.75 : 1, fontSize: 10 }}>
                    {item.status === 'sending' ? 'Sending…' : formatTime(item.timestamp)}
                  </Text>
                  {mine && !item.deleted ? (
                    item.status === 'sending' ? (
                      <Feather name="clock" size={10} color={mine ? tokens.onAccent : tokens.textMuted} style={{ opacity: 0.75 }} />
                    ) : (
                      <View style={{ flexDirection: 'row', marginLeft: 1 }}>
                        <Feather name="check" size={11} color={tickColor} style={{ opacity: read ? 1 : 0.75 }} />
                        {read ? <Feather name="check" size={11} color={tickColor} style={{ marginLeft: -6 }} /> : null}
                      </View>
                    )
                  ) : null}
                </>
              )}
            </View>
            {showReactions ? (
              <View style={{ position: 'absolute', bottom: -10, [mine ? 'left' : 'right']: 10 }}>
                <ReactionBadge reactions={item.reactions!} tokens={tokens} myUsername={myUsername} onReact={(emoji) => onReact(item, emoji)} />
              </View>
            ) : null}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '78%', paddingVertical: 10, paddingHorizontal: 13 },
  replyIconWrap: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  checkbox: { paddingRight: 8 },
});

export default React.memo(MessageRow);
