import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usersApi } from '../api/users';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii } from '../theme/tokens';

type Status = 'idle' | 'checking' | 'available' | 'unavailable';

export default function ChooseUsernameScreen() {
  const { tokens } = useTheme();
  const { user, claimHandle } = useAuthStore();
  const [handle, setHandle] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [reason, setReason] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const value = handle.trim().toLowerCase();
    setError(null);
    if (!value) {
      setStatus('idle');
      setReason(null);
      return;
    }
    setStatus('checking');
    const id = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await usersApi.checkHandle(value);
        if (id !== seq.current) return;
        setStatus(res.available ? 'available' : 'unavailable');
        setReason(res.available ? null : (res.reason ?? 'Not available'));
      } catch {
        if (id !== seq.current) return;
        setStatus('idle');
      }
    }, 400);
    return () => clearTimeout(t);
  }, [handle]);

  const handleSubmit = async () => {
    if (status !== 'available' || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await claimHandle(handle.trim().toLowerCase());
      // No navigation needed — RootNavigator re-renders once the user has a handle.
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Could not set username. Try another.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
      <View style={styles.body}>
        <View style={[styles.mark, { backgroundColor: tokens.accent }]}>
          <Text style={[styles.markLetter, { color: tokens.onAccent }]}>B</Text>
        </View>
        <Text style={[styles.title, { color: tokens.text }]}>Choose your username</Text>
        <Text style={[styles.subtitle, { color: tokens.textMuted }]}>
          This is how people will find and mention you{user?.displayName ? `, ${user.displayName}` : ''}.
        </Text>

        <View style={[styles.field, { backgroundColor: tokens.surface, borderRadius: radii.control }]}>
          <Text style={{ color: tokens.textMuted, fontSize: 15 }}>@</Text>
          <TextInput
            value={handle}
            onChangeText={(t) => setHandle(t.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
            placeholder="username"
            placeholderTextColor={tokens.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            maxLength={20}
            style={{ flex: 1, color: tokens.text, fontSize: 15, fontFamily: fonts.label }}
          />
          {status === 'available' ? <Feather name="check" size={18} color="#16A34A" /> : null}
          {status === 'unavailable' ? <Feather name="x" size={18} color="#DC5B4E" /> : null}
          {status === 'checking' ? <ActivityIndicator size="small" color={tokens.textMuted} /> : null}
        </View>
        <Text style={[styles.helper, { color: status === 'available' ? '#16A34A' : status === 'unavailable' ? '#DC5B4E' : tokens.textMuted }]}>
          {status === 'checking' && 'Checking availability…'}
          {status === 'available' && `@${handle} is available`}
          {status === 'unavailable' && reason}
          {status === 'idle' && '3–20 characters · letters, numbers, . and _'}
        </Text>

        {error ? <Text style={[styles.error, { color: '#DC5B4E' }]}>{error}</Text> : null}

        <TouchableOpacity
          style={[
            styles.cta,
            { backgroundColor: tokens.text, borderRadius: radii.control, opacity: status !== 'available' || isSaving ? 0.5 : 1 },
          ]}
          onPress={handleSubmit}
          disabled={status !== 'available' || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={tokens.background} />
          ) : (
            <Text style={[styles.ctaLabel, { color: tokens.background }]}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  mark: { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  markLetter: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -1 },
  title: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.4, marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 13, textAlign: 'center', marginBottom: 26, lineHeight: 18 },
  field: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 16 },
  helper: { width: '100%', fontSize: 11.5, marginTop: 8, paddingHorizontal: 2 },
  error: { fontSize: 12.5, fontFamily: fonts.label, marginTop: 10, paddingHorizontal: 2 },
  cta: { width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, marginTop: 18, minHeight: 50 },
  ctaLabel: { fontFamily: fonts.heading, fontSize: 15, letterSpacing: -0.2 },
});
