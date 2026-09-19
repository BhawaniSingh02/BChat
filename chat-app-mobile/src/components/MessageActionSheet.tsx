import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmojiPickerModal from './EmojiPickerModal';
import { ThemeTokens } from '../theme/tokens';
import { fonts, radii } from '../theme/tokens';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface Props {
  visible: boolean;
  tokens: ThemeTokens;
  mine: boolean;
  canEdit: boolean;
  canCopy: boolean;
  isStarred: boolean;
  canPin: boolean;
  isPinned: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onToggleStar: () => void;
  onForward: () => void;
  onTogglePin: () => void;
  onSelect: () => void;
}

export default function MessageActionSheet({
  visible,
  tokens,
  mine,
  canEdit,
  canCopy,
  isStarred,
  canPin,
  isPinned,
  onClose,
  onReact,
  onEdit,
  onDelete,
  onCopy,
  onToggleStar,
  onForward,
  onTogglePin,
  onSelect,
}: Props) {
  const [fullPickerOpen, setFullPickerOpen] = useState(false);
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <SafeAreaView style={styles.safe} edges={['bottom']}>
          <Pressable style={[styles.sheet, { backgroundColor: tokens.surface }]}>
            <View style={styles.emojiRow}>
              {QUICK_EMOJIS.map((emoji) => (
                <TouchableOpacity key={emoji} style={styles.emojiBtn} onPress={() => onReact(emoji)} hitSlop={6}>
                  <Text style={{ fontSize: 26 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.emojiBtn, styles.moreBtn, { backgroundColor: tokens.surface2 }]}
                onPress={() => setFullPickerOpen(true)}
                hitSlop={6}
              >
                <Feather name="plus" size={18} color={tokens.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={[styles.divider, { backgroundColor: tokens.border }]} />
            {canCopy ? <ActionRow icon="copy" label="Copy" tokens={tokens} onPress={onCopy} /> : null}
            <ActionRow icon="corner-up-right" label="Forward" tokens={tokens} onPress={onForward} />
            <ActionRow icon="star" label={isStarred ? 'Unstar' : 'Star'} tokens={tokens} onPress={onToggleStar} active={isStarred} />
            {canPin ? (
              <ActionRow icon="bookmark" label={isPinned ? 'Unpin' : 'Pin'} tokens={tokens} onPress={onTogglePin} active={isPinned} />
            ) : null}
            <ActionRow icon="check-square" label="Select" tokens={tokens} onPress={onSelect} />

            {mine ? (
              <>
                {canEdit ? <ActionRow icon="edit-2" label="Edit" tokens={tokens} onPress={onEdit} /> : null}
                <ActionRow icon="trash-2" label="Delete" tokens={tokens} danger onPress={onDelete} />
              </>
            ) : null}
          </Pressable>
        </SafeAreaView>
      </Pressable>

      <EmojiPickerModal
        visible={fullPickerOpen}
        tokens={tokens}
        onClose={() => setFullPickerOpen(false)}
        onSelect={(emoji) => {
          setFullPickerOpen(false);
          onReact(emoji);
        }}
      />
    </Modal>
  );
}

function ActionRow({ icon, label, tokens, danger, active, onPress }: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  tokens: ThemeTokens;
  danger?: boolean;
  active?: boolean;
  onPress: () => void;
}) {
  const color = danger ? '#DC5B4E' : active ? tokens.accentStrong : tokens.text;
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress}>
      <Feather name={icon} size={18} color={color} />
      <Text style={{ color, fontSize: 15, fontFamily: fonts.heading }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  safe: { width: '100%' },
  sheet: { borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card, paddingTop: 14, paddingBottom: 8, paddingHorizontal: 10 },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 14 },
  emojiBtn: { padding: 6 },
  moreBtn: { borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, marginBottom: 6 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 10 },
});
