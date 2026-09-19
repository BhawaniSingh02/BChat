import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

export default function SignInScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const { signIn, isSigningIn, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (!email.trim() || !password) return;
    signIn(email.trim(), password).catch(() => {});
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
      <KeyboardAvoidingView style={styles.body} behavior="padding">
        <View style={[styles.mark, { backgroundColor: tokens.accent }]}>
          <Text style={[styles.markLetter, { color: tokens.onAccent }]}>B</Text>
        </View>
        <Text style={[styles.wordmark, { color: tokens.text }]}>Baaat</Text>
        <Text style={[styles.tagline, { color: tokens.textMuted }]}>
          CONVERSATIONS, REFINED
        </Text>

        <View style={styles.fields}>
          <TextInput
            placeholder="Email or username"
            placeholderTextColor={tokens.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={[
              styles.input,
              { backgroundColor: tokens.surface, color: tokens.text, borderRadius: radii.control },
            ]}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor={tokens.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={[
              styles.input,
              { backgroundColor: tokens.surface, color: tokens.text, borderRadius: radii.control },
            ]}
          />

          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => {
              clearError();
              navigation.navigate('ForgotPassword');
            }}
            hitSlop={6}
          >
            <Text style={{ color: tokens.textMuted, fontSize: 12.5 }}>Forgot password?</Text>
          </TouchableOpacity>

          {error ? (
            <Text style={[styles.error, { color: '#DC5B4E' }]}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.cta,
              { backgroundColor: tokens.text, borderRadius: radii.control, opacity: isSigningIn ? 0.7 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={isSigningIn}
          >
            {isSigningIn ? (
              <ActivityIndicator color={tokens.background} />
            ) : (
              <Text style={[styles.ctaLabel, { color: tokens.background }]}>Continue</Text>
            )}
          </TouchableOpacity>

          {isSigningIn ? (
            <Text style={[styles.hint, { color: tokens.textMuted }]}>
              First sign-in can take up to a minute while the server wakes up.
            </Text>
          ) : null}
        </View>

        <Text style={[styles.foot, { color: tokens.textMuted }]}>
          New here?{' '}
          <Text
            style={{ color: tokens.text, fontFamily: fonts.heading }}
            onPress={() => {
              clearError();
              navigation.navigate('SignUp');
            }}
          >
            Create an account
          </Text>
        </Text>
      </KeyboardAvoidingView>
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
  error: { fontSize: 12.5, fontFamily: fonts.label, paddingHorizontal: 2 },
  forgotLink: { alignSelf: 'flex-end', paddingVertical: 2 },
  cta: { alignItems: 'center', justifyContent: 'center', paddingVertical: 15, marginTop: 6, minHeight: 50 },
  ctaLabel: { fontFamily: fonts.heading, fontSize: 15, letterSpacing: -0.2 },
  hint: { fontSize: 11.5, textAlign: 'center', marginTop: 4 },
  foot: { marginTop: 20, fontSize: 13 },
});
