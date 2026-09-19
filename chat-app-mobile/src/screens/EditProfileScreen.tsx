import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';
import { usersApi } from '../api/users';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

type HandleStatus = 'idle' | 'checking' | 'available' | 'unavailable';

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

export default function EditProfileScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const { user, updateProfile, uploadAvatar, removeAvatar, claimHandle } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [handle, setHandle] = useState(user?.uniqueHandle ?? '');
  const [handleStatus, setHandleStatus] = useState<HandleStatus>('idle');
  const [handleReason, setHandleReason] = useState<string | null>(null);
  const [isSavingHandle, setIsSavingHandle] = useState(false);
  const handleSeq = useRef(0);

  useEffect(() => {
    const value = handle.trim().toLowerCase();
    if (!value || value === (user?.uniqueHandle ?? '')) {
      setHandleStatus('idle');
      setHandleReason(null);
      return;
    }
    setHandleStatus('checking');
    const id = ++handleSeq.current;
    const t = setTimeout(async () => {
      try {
        const res = await usersApi.checkHandle(value);
        if (id !== handleSeq.current) return;
        setHandleStatus(res.available ? 'available' : 'unavailable');
        setHandleReason(res.available ? null : (res.reason ?? 'Not available'));
      } catch {
        if (id === handleSeq.current) setHandleStatus('idle');
      }
    }, 400);
    return () => clearTimeout(t);
  }, [handle, user?.uniqueHandle]);

  const handleSaveHandle = async () => {
    setIsSavingHandle(true);
    try {
      await claimHandle(handle.trim().toLowerCase());
      setHandleStatus('idle');
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Could not update username.');
    } finally {
      setIsSavingHandle(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await updateProfile({ displayName, bio, statusMessage });
      navigation.goBack();
    } catch {
      setError('Could not save your profile. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const pickAndUploadAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library access is needed to change your photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    setIsUploadingAvatar(true);
    setError(null);
    try {
      await uploadAvatar({ uri: asset.uri, name: asset.fileName ?? `avatar-${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg' });
    } catch {
      setError('Could not upload photo. Try again.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = () => {
    Alert.alert('Remove photo?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setIsUploadingAvatar(true);
          try {
            await removeAvatar();
          } catch {
            setError('Could not remove photo. Try again.');
          } finally {
            setIsUploadingAvatar(false);
          }
        },
      },
    ]);
  };

  const handleAvatarPress = () => {
    if (isUploadingAvatar) return;
    if (user?.avatarUrl) {
      Alert.alert('Profile photo', undefined, [
        { text: 'Change photo', onPress: pickAndUploadAvatar },
        { text: 'Remove photo', style: 'destructive', onPress: handleRemoveAvatar },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      pickAndUploadAvatar();
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
      <View style={[styles.header, { borderBottomColor: tokens.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="chevron-left" size={22} color={tokens.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: tokens.text }]}>Edit profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving} hitSlop={12}>
          {isSaving ? (
            <ActivityIndicator color={tokens.accentStrong} />
          ) : (
            <Text style={{ color: tokens.accentStrong, fontFamily: fonts.heading, fontSize: 14 }}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.avatarRow}>
            <TouchableOpacity onPress={handleAvatarPress} disabled={isUploadingAvatar}>
              <Avatar
                initials={initialsFor(user?.username ?? '??')}
                color={tokens.accent}
                textColor={tokens.onAccent}
                size={72}
                imageUrl={user?.avatarUrl}
              />
              <View style={[styles.avatarBadge, { backgroundColor: tokens.accent, borderColor: tokens.background }]}>
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color={tokens.onAccent} />
                ) : (
                  <Feather name="camera" size={13} color={tokens.onAccent} />
                )}
              </View>
            </TouchableOpacity>
          </View>

          {error ? <Text style={{ color: '#DC5B4E', fontSize: 12.5, textAlign: 'center' }}>{error}</Text> : null}

          <View style={styles.field}>
            <Text style={[styles.label, { color: tokens.textMuted }]}>USERNAME</Text>
            <View style={styles.handleRow}>
              <View style={[styles.handleField, { backgroundColor: tokens.surface, borderRadius: radii.control }]}>
                <Text style={{ color: tokens.textMuted, fontSize: 14 }}>@</Text>
                <TextInput
                  value={handle}
                  onChangeText={(t) => setHandle(t.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                  placeholder="username"
                  placeholderTextColor={tokens.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                  style={{ flex: 1, color: tokens.text, fontSize: 14, fontFamily: fonts.label }}
                />
                {handleStatus === 'checking' ? <ActivityIndicator size="small" color={tokens.textMuted} /> : null}
                {handleStatus === 'available' ? <Feather name="check" size={16} color="#16A34A" /> : null}
                {handleStatus === 'unavailable' ? <Feather name="x" size={16} color="#DC5B4E" /> : null}
              </View>
              {handleStatus === 'available' ? (
                <TouchableOpacity
                  style={[styles.handleSaveBtn, { backgroundColor: tokens.text, borderRadius: radii.control }]}
                  onPress={handleSaveHandle}
                  disabled={isSavingHandle}
                >
                  {isSavingHandle ? (
                    <ActivityIndicator size="small" color={tokens.background} />
                  ) : (
                    <Text style={{ color: tokens.background, fontFamily: fonts.heading, fontSize: 12.5 }}>Save</Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={{ color: handleStatus === 'unavailable' ? '#DC5B4E' : handleStatus === 'available' ? '#16A34A' : tokens.textMuted, fontSize: 11 }}>
              {handleStatus === 'checking' && 'Checking availability…'}
              {handleStatus === 'available' && `@${handle} is available`}
              {handleStatus === 'unavailable' && handleReason}
              {handleStatus === 'idle' && 'People find and mention you by this @username'}
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: tokens.textMuted }]}>DISPLAY NAME</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={user?.username}
              placeholderTextColor={tokens.textMuted}
              style={[styles.input, { backgroundColor: tokens.surface, color: tokens.text, borderRadius: radii.control }]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: tokens.textMuted }]}>STATUS</Text>
            <TextInput
              value={statusMessage}
              onChangeText={setStatusMessage}
              placeholder="Hey there! I am using Baaat"
              placeholderTextColor={tokens.textMuted}
              style={[styles.input, { backgroundColor: tokens.surface, color: tokens.text, borderRadius: radii.control }]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: tokens.textMuted }]}>BIO</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people about yourself"
              placeholderTextColor={tokens.textMuted}
              multiline
              numberOfLines={4}
              style={[
                styles.input,
                { backgroundColor: tokens.surface, color: tokens.text, borderRadius: radii.control, minHeight: 90, textAlignVertical: 'top' },
              ]}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontFamily: fonts.heading, fontSize: 16, letterSpacing: -0.2 },
  body: { padding: 20, gap: 20 },
  avatarRow: { alignItems: 'center', marginBottom: 4 },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: { gap: 8 },
  label: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 1 },
  input: { paddingVertical: 12, paddingHorizontal: 14, fontSize: 14 },
  handleRow: { flexDirection: 'row', gap: 8 },
  handleField: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 14 },
  handleSaveBtn: { paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
});
