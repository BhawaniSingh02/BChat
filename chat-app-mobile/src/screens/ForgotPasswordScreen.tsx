import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const forgotPassword = useAuthStore((s) => s.forgotPassword);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setIsSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setSubmitted(true);
    } catch {
      setSubmitted(true); // Same response either way — avoids revealing whether the email exists.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} hitSlop={12}>
        <Feather name="chevron-left" size={22} color={tokens.text} />
      </TouchableOpacity>

      <View style={styles.body}>
        {submitted ? (
          <>
            <View style={[styles.iconWrap, { backgroundColor: tokens.accent }]}>
              <Feather name="mail" size={22} color={tokens.onAccent} />
            </View>
            <Text style={[styles.title, { color: tokens.text }]}>Check your email</Text>
            <Text style={[styles.subtitle, { color: tokens.textMuted }]}>
              If that email is registered, we've sent a password reset link. It expires in 1 hour.
            </Text>
            <TouchableOpacity
              style={[styles.cta, { backgroundColor: tokens.text, borderRadius: radii.control }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.ctaLabel, { color: tokens.background }]}>Back to sign in</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: tokens.text }]}>Forgot password?</Text>
            <Text style={[styles.subtitle, { color: tokens.textMuted }]}>Enter your email and we'll send you a reset link.</Text>

            <TextInput
              placeholder="Email"
              placeholderTextColor={tokens.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              style={[styles.input, { backgroundColor: tokens.surface, color: tokens.text, borderRadius: radii.control }]}
            />

            <TouchableOpacity
              style={[styles.cta, { backgroundColor: tokens.text, borderRadius: radii.control, opacity: isSubmitting ? 0.7 : 1 }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={tokens.background} />
              ) : (
                <Text style={[styles.ctaLabel, { color: tokens.background }]}>Send reset link</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  back: { paddingHorizontal: 16, paddingTop: 8 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { fontFamily: fonts.display, fontSize: 21, letterSpacing: -0.4, marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 13, textAlign: 'center', marginBottom: 26, lineHeight: 18 },
  input: { width: '100%', paddingVertical: 14, paddingHorizontal: 16, fontSize: 15 },
  cta: { width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, marginTop: 14, minHeight: 50 },
  ctaLabel: { fontFamily: fonts.heading, fontSize: 15, letterSpacing: -0.2 },
});
