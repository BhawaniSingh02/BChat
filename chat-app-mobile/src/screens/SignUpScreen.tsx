import { Feather } from '@expo/vector-icons';
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

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

export default function SignUpScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const { register, isSigningIn, error, clearError } = useAuthStore();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    if (!displayName.trim() || !email.trim() || password.length < 6) return;
    try {
      await register(displayName.trim(), email.trim(), password);
      navigation.navigate('VerifyEmail', { email: email.trim() });
    } catch {
      // error set in store
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
      <TouchableOpacity
        style={styles.back}
        onPress={() => {
          clearError();
          navigation.goBack();
        }}
        hitSlop={12}
      >
        <Feather name="chevron-left" size={22} color={tokens.text} />
      </TouchableOpacity>

      <KeyboardAvoidingView style={styles.body} behavior="padding">
        <View style={[styles.mark, { backgroundColor: tokens.accent }]}>
          <Text style={[styles.markLetter, { color: tokens.onAccent }]}>B</Text>
        </View>
        <Text style={[styles.wordmark, { color: tokens.text }]}>Baaat</Text>

        <View style={styles.fields}>
          <TextInput
            placeholder="Display name"
            placeholderTextColor={tokens.textMuted}
            autoCapitalize="words"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={50}
            style={[styles.input, { backgroundColor: tokens.surface, color: tokens.text, borderRadius: radii.control }]}
          />
          <TextInput
            placeholder="Email"
            placeholderTextColor={tokens.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={[styles.input, { backgroundColor: tokens.surface, color: tokens.text, borderRadius: radii.control }]}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor={tokens.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { backgroundColor: tokens.surface, color: tokens.text, borderRadius: radii.control }]}
          />
          <Text style={[styles.hint, { color: tokens.textMuted }]}>At least 6 characters</Text>

          {error ? <Text style={[styles.error, { color: '#DC5B4E' }]}>{error}</Text> : null}

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
        </View>

        <Text style={[styles.foot, { color: tokens.textMuted }]}>
          Already have an account?{' '}
          <Text
            style={{ color: tokens.text, fontFamily: fonts.heading }}
            onPress={() => {
              clearError();
              navigation.goBack();
            }}
          >
            Sign in
          </Text>
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  back: { paddingHorizontal: 16, paddingTop: 8 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  mark: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  markLetter: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -2 },
  wordmark: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -1, marginBottom: 34 },
  fields: { width: '100%', gap: 10 },
  input: { width: '100%', paddingVertical: 14, paddingHorizontal: 16, fontSize: 15 },
  hint: { fontSize: 11.5, paddingHorizontal: 2, marginTop: -3 },
  error: { fontSize: 12.5, fontFamily: fonts.label, paddingHorizontal: 2 },
  cta: { alignItems: 'center', justifyContent: 'center', paddingVertical: 15, marginTop: 6, minHeight: 50 },
  ctaLabel: { fontFamily: fonts.heading, fontSize: 15, letterSpacing: -0.2 },
  foot: { marginTop: 20, fontSize: 13 },
});
