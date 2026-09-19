import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Message } from '../types';
import { fonts, radii, ThemeTokens } from '../theme/tokens';

const MAX_VISIBLE_TILES = 4;
const GRID_WIDTH = 220;
const GAP = 2;
const TILE_SIZE = (GRID_WIDTH - GAP) / 2;

function GridTile({
  message, isLast, overflowCount, onPress, onLongPress, tokens, disabled, highlighted,
}: {
  message: Message;
  isLast: boolean;
  overflowCount: number;
  onPress: () => void;
  onLongPress: () => void;
  tokens: ThemeTokens;
  disabled: boolean;
  highlighted: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const highlightOpacity = useRef(new Animated.Value(0)).current;

  // Mirrors MessageRow's jump-target flash so tapping a reply-quote, a pinned message, or a
  // search result that now lives inside a group still visually confirms which photo it landed
  // on — this was previously silently dropped for grouped images (no highlight prop existed).
  useEffect(() => {
    if (highlighted) {
      highlightOpacity.setValue(0.35);
      Animated.timing(highlightOpacity, { toValue: 0, duration: 1200, useNativeDriver: true }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlighted]);

  return (
    <TouchableOpacity
      style={{ width: TILE_SIZE, height: TILE_SIZE, backgroundColor: tokens.surface2, overflow: 'hidden', opacity: disabled ? 0.5 : 1 }}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={280}
      activeOpacity={disabled ? 1 : 0.7}
      testID="media-grid-tile"
    >
      {!loaded && !errored ? (
        <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator color={tokens.textMuted} />
        </View>
      ) : null}
      {!errored ? (
        <Image
          source={{ uri: message.fileUrl }}
          style={{ width: TILE_SIZE, height: TILE_SIZE, opacity: loaded ? 1 : 0 }}
          resizeMode="cover"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
          <Feather name="image" size={16} color={tokens.textMuted} />
        </View>
      )}
      {isLast && overflowCount > 0 ? (
        <View
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }]}
          testID="media-grid-overflow"
        >
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>+{overflowCount}</Text>
        </View>
      ) : null}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: tokens.accentStrong, opacity: highlightOpacity }]}
        testID="media-grid-tile-highlight"
      />
    </TouchableOpacity>
  );
}

interface Props {
  messages: Message[];
  mine: boolean;
  tokens: ThemeTokens;
  /** Opens the full-screen viewer at the tapped tile, navigable across the whole run
   * (including images hidden behind "+N"), not just the visible tiles. */
  onOpenViewer: (images: string[], index: number) => void;
  /** Long-press opens the existing single-message action sheet for that one photo —
   * there is no group-level menu. */
  onLongPressTile: (message: Message) => void;
  selectionMode?: boolean;
  /** Briefly flashes whichever tile matches — set when jumping here from a reply quote,
   * a pinned message, or search. */
  highlightedMessageId?: string | null;
}

/**
 * Compact grid bubble for a run of consecutive images from the same sender (see
 * buildRenderUnits in utils/messageGrouping.ts). Shows up to MAX_VISIBLE_TILES tiles, with a
 * "+N" overlay on the last tile when the run has more.
 */
export default function MediaGrid({
  messages, mine, tokens, onOpenViewer, onLongPressTile, selectionMode, highlightedMessageId,
}: Props) {
  const visible = messages.slice(0, MAX_VISIBLE_TILES);
  const overflowCount = messages.length - MAX_VISIBLE_TILES;
  const urls = messages.map((m) => m.fileUrl!);

  return (
    <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
      {!mine ? (
        <Text style={{ color: tokens.accentStrong, fontSize: 11, fontFamily: fonts.label, marginBottom: 2, marginLeft: 2 }}>
          {messages[0].senderName}
        </Text>
      ) : null}
      <View
        style={{
          width: GRID_WIDTH,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: GAP,
          borderRadius: radii.bubble,
          overflow: 'hidden',
          backgroundColor: mine ? tokens.accent : tokens.surface,
          padding: GAP,
        }}
        testID="media-grid"
      >
        {visible.map((message, i) => (
          <GridTile
            key={message.id}
            message={message}
            isLast={i === MAX_VISIBLE_TILES - 1}
            overflowCount={overflowCount > 0 ? overflowCount : 0}
            onPress={() => { if (!selectionMode) onOpenViewer(urls, i); }}
            onLongPress={() => { if (!selectionMode) onLongPressTile(message); }}
            tokens={tokens}
            disabled={!!selectionMode}
            highlighted={message.id === highlightedMessageId}
          />
        ))}
      </View>
    </View>
  );
}
