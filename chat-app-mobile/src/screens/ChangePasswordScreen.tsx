import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'ChangePassword'>;

export default function ChangePasswordScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const changePassword = useAuthStore((s) => s.changePassword);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = currentPassword.length > 0 && newPassword.length >= 6 && confirmPassword.length > 0;

  const handleSubmit = async () => {
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.response?.data?.detail ?? 'Could not change password.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
      <View style={[styles.header, { borderBottomColor: tokens.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="chevron-left" size={22} color={tokens.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: tokens.text }]}>Change password</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.body}>
          {success ? (
            <Text style={[styles.success, { color: '#16A34A' }]}>Password changed successfully.</Text>
          ) : null}
          {error ? <Text style={[styles.error, { color: '#DC5B4E' }]}>{error}</Text> : null}

          <View style={styles.field}>
            <Text style={[styles.label, { color: tokens.textMuted }]}>CURRENT PASSWORD</Text>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="Enter current password"
              placeholderTextColor={tokens.textMuted}
              style={[styles.input, { backgroundColor: tokens.surface, color: tokens.text, borderRadius: radii.control }]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: tokens.textMuted }]}>NEW PASSWORD</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="At least 6 characters"
              placeholderTextColor={tokens.textMuted}
              style={[styles.input, { backgroundColor: tokens.surface, color: tokens.text, borderRadius: radii.control }]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: tokens.textMuted }]}>CONFIRM NEW PASSWORD</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Repeat new password"
              placeholderTextColor={tokens.textMuted}
              style={[styles.input, { backgroundColor: tokens.surface, color: tokens.text, borderRadius: radii.control }]}
            />
          </View>

          <TouchableOpacity
            style={[styles.cta, { backgroundColor: tokens.text, borderRadius: radii.control, opacity: canSubmit && !isSaving ? 1 : 0.5 }]}
            onPress={handleSubmit}
            disabled={!canSubmit || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={tokens.background} />
            ) : (
              <Text style={[styles.ctaLabel, { color: tokens.background }]}>Change password</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontFamily: fonts.heading, fontSize: 16, letterSpacing: -0.2 },
  body: { padding: 20, gap: 16 },
  field: { gap: 8 },
  label: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 1 },
  input: { paddingVertical: 12, paddingHorizontal: 14, fontSize: 14 },
  error: { fontSize: 12.5, fontFamily: fonts.label },
  success: { fontSize: 12.5, fontFamily: fonts.label },
  cta: { alignItems: 'center', justifyContent: 'center', paddingVertical: 15, marginTop: 6, minHeight: 50 },
  ctaLabel: { fontFamily: fonts.heading, fontSize: 15, letterSpacing: -0.2 },
});
