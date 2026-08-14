import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

export default function SignInScreen({ navigation }: Props) {
  const { tokens } = useTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
      <View style={styles.body}>
        <View style={[styles.mark, { backgroundColor: tokens.accent }]}>
          <Text style={[styles.markLetter, { color: tokens.onAccent }]}>B</Text>
        </View>
        <Text style={[styles.wordmark, { color: tokens.text }]}>Baaat</Text>
        <Text style={[styles.tagline, { color: tokens.textMuted }]}>
          CONVERSATIONS, REFINED
        </Text>

        <View style={styles.fields}>
          <TextInput
            placeholder="Phone number or email"
            placeholderTextColor={tokens.textMuted}
            style={[
              styles.input,
              { backgroundColor: tokens.surface, color: tokens.text, borderRadius: radii.control },
            ]}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor={tokens.textMuted}
            secureTextEntry
            style={[
              styles.input,
              { backgroundColor: tokens.surface, color: tokens.text, borderRadius: radii.control },
            ]}
          />
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: tokens.text, borderRadius: radii.control }]}
            onPress={() => navigation.replace('Main')}
          >
            <Text style={[styles.ctaLabel, { color: tokens.background }]}>Continue</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.foot, { color: tokens.textMuted }]}>
          New here?{' '}
          <Text style={{ color: tokens.text, fontFamily: fonts.heading }}>Create an account</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  mark: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  markLetter: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -2 },
  wordmark: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -1, marginBottom: 4 },
  tagline: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 2, marginBottom: 34 },
  fields: { width: '100%', gap: 10 },
  input: { width: '100%', paddingVertical: 14, paddingHorizontal: 16, fontSize: 15 },
  cta: { alignItems: 'center', paddingVertical: 15, marginTop: 6 },
  ctaLabel: { fontFamily: fonts.heading, fontSize: 15, letterSpacing: -0.2 },
  foot: { marginTop: 20, fontSize: 13 },
});
