import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { useRoomStore } from '../store/roomStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateGroup'>;

export default function CreateGroupScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const createRoom = useRoomStore((s) => s.createRoom);
  const [roomId, setRoomId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = roomId.trim().length >= 3 && name.trim().length > 0;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setIsCreating(true);
    setError(null);
    try {
      const room = await createRoom(roomId.trim().toLowerCase(), name.trim(), description.trim() || undefined);
      navigation.replace('Conversation', { roomId: room.roomId, name: room.name, kind: 'room' });
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Could not create group. Try a different room ID.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
      <View style={[styles.header, { borderBottomColor: tokens.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="x" size={22} color={tokens.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: tokens.text }]}>New group</Text>
        <TouchableOpacity onPress={handleCreate} disabled={!canSubmit || isCreating} hitSlop={12}>
          {isCreating ? (
            <ActivityIndicator color={tokens.accentStrong} />
          ) : (
            <Text style={{ color: canSubmit ? tokens.accentStrong : tokens.textMuted, fontFamily: fonts.heading, fontSize: 14 }}>
              Create
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.body}>
          {error ? <Text style={{ color: '#DC5B4E', fontSize: 12.5, fontFamily: fonts.label }}>{error}</Text> : null}

          <View style={styles.field}>
            <Text style={[styles.label, { color: tokens.textMuted }]}>ROOM ID</Text>
            <TextInput
              value={roomId}
              onChangeText={(t) => setRoomId(t.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="e.g. weekend-plans"
              placeholderTextColor={tokens.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={50}
              style={[styles.input, { backgroundColor: tokens.surface, color: tokens.text, borderRadius: radii.control }]}
            />
            <Text style={{ color: tokens.textMuted, fontSize: 11 }}>
              How people join — share this ID so others can find and join the group.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: tokens.textMuted }]}>GROUP NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Weekend Plans"
              placeholderTextColor={tokens.textMuted}
              maxLength={100}
              style={[styles.input, { backgroundColor: tokens.surface, color: tokens.text, borderRadius: radii.control }]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: tokens.textMuted }]}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What's this group about?"
              placeholderTextColor={tokens.textMuted}
              multiline
              maxLength={500}
              style={[
                styles.input,
                { backgroundColor: tokens.surface, color: tokens.text, borderRadius: radii.control, minHeight: 80, textAlignVertical: 'top' },
              ]}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontFamily: fonts.heading, fontSize: 16, letterSpacing: -0.2 },
  body: { padding: 20, gap: 18 },
  field: { gap: 8 },
  label: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 1 },
  input: { paddingVertical: 12, paddingHorizontal: 14, fontSize: 14 },
});
