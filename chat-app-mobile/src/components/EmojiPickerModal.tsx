import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EMOJI_CATEGORIES } from '../data/emojiCategories';
import { fonts, radii, ThemeTokens } from '../theme/tokens';

interface Props {
  visible: boolean;
  tokens: ThemeTokens;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const COLUMNS = 8;

export default function EmojiPickerModal({ visible, tokens, onSelect, onClose }: Props) {
  const [categoryIndex, setCategoryIndex] = useState(0);
  if (!visible) return null;
  const category = EMOJI_CATEGORIES[categoryIndex];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <SafeAreaView style={styles.safe} edges={['bottom']}>
          <Pressable style={[styles.sheet, { backgroundColor: tokens.surface }]}>
            <View style={styles.header}>
              <Text style={{ color: tokens.text, fontFamily: fonts.heading, fontSize: 14 }}>{category.label}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <Text style={{ color: tokens.accentStrong, fontFamily: fonts.label, fontSize: 13 }}>Close</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={category.emojis}
              key={category.key}
              keyExtractor={(e, i) => `${category.key}-${i}`}
              numColumns={COLUMNS}
              contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.emojiCell} onPress={() => onSelect(item)} hitSlop={2}>
                  <Text style={{ fontSize: 26 }}>{item}</Text>
                </TouchableOpacity>
              )}
              style={styles.grid}
            />

            <View style={[styles.tabRow, { borderTopColor: tokens.border }]}>
              <FlatList
                horizontal
                data={EMOJI_CATEGORIES}
                keyExtractor={(c) => c.key}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 10, gap: 4 }}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    onPress={() => setCategoryIndex(index)}
                    style={[
                      styles.tabBtn,
                      index === categoryIndex && { backgroundColor: tokens.surface2 },
                    ]}
                  >
                    <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  safe: { width: '100%' },
  sheet: { borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card, height: 380, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  grid: { flex: 1 },
  emojiCell: { flex: 1 / COLUMNS, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  tabRow: { borderTopWidth: 1, paddingVertical: 6 },
  tabBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
