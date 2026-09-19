import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ThemeTokens } from '../theme/tokens';

const LENGTH = 6;

interface Props {
  value: string;
  onChange: (value: string) => void;
  tokens: ThemeTokens;
  autoFocus?: boolean;
}

/**
 * Six-box OTP entry backed by a single hidden TextInput — avoids the focus-juggling
 * bugs of per-digit inputs (backspace across boxes, paste, keyboard dismiss) while
 * still rendering the familiar segmented look.
 */
export default function OtpInput({ value, onChange, tokens, autoFocus }: Props) {
  const inputRef = useRef<TextInput>(null);

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={styles.row}>
      {Array.from({ length: LENGTH }).map((_, i) => {
        const digit = value[i];
        const isActive = i === value.length;
        return (
          <View
            key={i}
            style={[
              styles.box,
              { backgroundColor: tokens.surface },
              isActive ? { borderColor: tokens.accent, borderWidth: 2 } : null,
            ]}
          >
            <Text style={[styles.digit, { color: digit ? tokens.text : tokens.textMuted }]}>{digit ?? ''}</Text>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, LENGTH))}
        keyboardType="number-pad"
        maxLength={LENGTH}
        autoFocus={autoFocus}
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  box: { width: 44, height: 54, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  digit: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
