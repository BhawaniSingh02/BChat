import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OtpInput from '../components/OtpInput';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyEmail'>;

export default function VerifyEmailScreen({ route, navigation }: Props) {
  const { tokens } = useTheme();
  const { email } = route.params;
  const { verifyEmailOtp, resendVerification, isSigningIn, error, clearError } = useAuthStore();
  const [code, setCode] = useState('');
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    try {
      await verifyEmailOtp(email, code);
      // Navigator re-renders on its own once the store has a token — the account
      // may still need to claim a @handle, which the navigator gates separately.
    } catch {
      // error set in store
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const message = await resendVerification(email);
      setResendMessage(message);
    } catch {
      setResendMessage('Could not resend. Please try again.');
    } finally {
      setIsResending(false);
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

      <View style={styles.body}>
        <View style={[styles.iconWrap, { backgroundColor: tokens.accent }]}>
          <Feather name="mail" size={22} color={tokens.onAccent} />
        </View>
        <Text style={[styles.title, { color: tokens.text }]}>Check your email</Text>
        <Text style={[styles.subtitle, { color: tokens.textMuted }]}>We've sent a 6-digit code to your email</Text>

        <OtpInput value={code} onChange={setCode} tokens={tokens} autoFocus />

        {error ? <Text style={[styles.error, { color: '#DC5B4E' }]}>{error}</Text> : null}

        <TouchableOpacity
          style={[
            styles.cta,
            { backgroundColor: tokens.text, borderRadius: radii.control, opacity: isSigningIn || code.length !== 6 ? 0.6 : 1 },
          ]}
          onPress={handleVerify}
          disabled={isSigningIn || code.length !== 6}
        >
          {isSigningIn ? (
            <ActivityIndicator color={tokens.background} />
          ) : (
            <Text style={[styles.ctaLabel, { color: tokens.background }]}>Verify & continue</Text>
          )}
        </TouchableOpacity>

        {resendMessage ? (
          <Text style={[styles.resendMsg, { color: tokens.accentStrong }]}>{resendMessage}</Text>
        ) : (
          <TouchableOpacity onPress={handleResend} disabled={isResending} hitSlop={8}>
            <Text style={[styles.resend, { color: tokens.textMuted }]}>
              {isResending ? 'Resending…' : "Didn't get it? Resend code"}
            </Text>
          </TouchableOpacity>
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
  title: { fontFamily: fonts.display, fontSize: 21, letterSpacing: -0.4, marginBottom: 6 },
  subtitle: { fontSize: 13, textAlign: 'center', marginBottom: 26 },
  error: { fontSize: 12.5, fontFamily: fonts.label, marginTop: 14, textAlign: 'center' },
  cta: { width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, marginTop: 22, minHeight: 50 },
  ctaLabel: { fontFamily: fonts.heading, fontSize: 15, letterSpacing: -0.2 },
  resend: { fontSize: 12.5, fontFamily: fonts.label, marginTop: 18 },
  resendMsg: { fontSize: 12.5, fontFamily: fonts.label, marginTop: 18, textAlign: 'center' },
});
