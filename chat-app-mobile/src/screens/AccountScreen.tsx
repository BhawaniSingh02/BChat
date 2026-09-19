import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Account'>;

export default function AccountScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const user = useAuthStore((s) => s.user);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
      <View style={[styles.header, { borderBottomColor: tokens.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="chevron-left" size={22} color={tokens.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: tokens.text }]}>Account</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: tokens.textMuted }]}>EMAIL</Text>
          <View style={[styles.row, { backgroundColor: tokens.surface, borderRadius: radii.control }]}>
            <Text style={{ color: tokens.text, fontSize: 14, flex: 1 }}>{user?.email}</Text>
            {user?.emailVerified ? (
              <View style={styles.verifiedPill}>
                <Feather name="check" size={11} color="#16A34A" />
                <Text style={{ color: '#16A34A', fontSize: 11, fontFamily: fonts.label }}>Verified</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: tokens.textMuted }]}>USERNAME</Text>
          <View style={[styles.row, { backgroundColor: tokens.surface, borderRadius: radii.control }]}>
            <Text style={{ color: tokens.text, fontSize: 14 }}>@{user?.uniqueHandle ?? '—'}</Text>
          </View>
          <Text style={{ color: tokens.textMuted, fontSize: 11 }}>Change this from Edit profile</Text>
        </View>

        <TouchableOpacity
          style={[styles.actionRow, { backgroundColor: tokens.surface, borderRadius: radii.control }]}
          onPress={() => navigation.navigate('ChangePassword')}
        >
          <Feather name="lock" size={16} color={tokens.text} />
          <Text style={{ color: tokens.text, fontSize: 14, fontFamily: fonts.label, flex: 1 }}>Change password</Text>
          <Feather name="chevron-right" size={16} color={tokens.tabInactive} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontFamily: fonts.heading, fontSize: 16, letterSpacing: -0.2 },
  body: { padding: 20, gap: 20 },
  field: { gap: 8 },
  label: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 14 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14, marginTop: 4 },
});
