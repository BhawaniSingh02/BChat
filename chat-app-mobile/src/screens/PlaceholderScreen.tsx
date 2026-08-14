import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';

export default function PlaceholderScreen({ title }: { title: string }) {
  const { tokens } = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
      <Text style={[styles.title, { color: tokens.text }]}>{title}</Text>
      <Text style={[styles.note, { color: tokens.textMuted }]}>Coming in a later build phase.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  title: { fontFamily: fonts.display, fontSize: 20 },
  note: { fontSize: 13 },
});
