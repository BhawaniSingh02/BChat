import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii } from '../theme/tokens';
import { openRemoteFile, saveFileToDevice } from '../utils/openFile';

function fileNameFromUrl(url: string): string {
  const last = url.split('/').pop() ?? 'file';
  return decodeURIComponent(last.split('?')[0]);
}

interface Props {
  fileUrl: string | null;
  messageType?: 'FILE' | 'VIDEO';
  onClose: () => void;
}

export default function FilePreviewModal({ fileUrl, messageType, onClose }: Props) {
  const { tokens } = useTheme();
  const [isOpening, setIsOpening] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!fileUrl) return null;
  const filename = fileNameFromUrl(fileUrl);

  const handleOpen = async () => {
    setIsOpening(true);
    try {
      await openRemoteFile(fileUrl, filename);
    } catch {
      Alert.alert('Could not open file', 'No app on this device can open this file type.');
    } finally {
      setIsOpening(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await saveFileToDevice(fileUrl, filename);
      if (saved) Alert.alert('Saved', `${filename} was saved to your device.`);
    } catch {
      Alert.alert('Could not save file', 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <SafeAreaView style={styles.safe} edges={['bottom']}>
          <Pressable style={[styles.sheet, { backgroundColor: tokens.surface }]}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={10}>
              <Feather name="x" size={20} color={tokens.textMuted} />
            </TouchableOpacity>

            <View style={[styles.iconWrap, { backgroundColor: tokens.accent }]}>
              <Feather name={messageType === 'VIDEO' ? 'film' : 'file-text'} size={26} color={tokens.onAccent} />
            </View>
            <Text style={[styles.filename, { color: tokens.text }]} numberOfLines={2}>
              {filename}
            </Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: tokens.accent }]}
                onPress={handleOpen}
                disabled={isOpening}
              >
                {isOpening ? (
                  <ActivityIndicator size="small" color={tokens.onAccent} />
                ) : (
                  <Feather name="external-link" size={16} color={tokens.onAccent} />
                )}
                <Text style={{ color: tokens.onAccent, fontSize: 13.5, fontFamily: fonts.heading }}>Open</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: tokens.surface2 }]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={tokens.text} />
                ) : (
                  <Feather name="download" size={16} color={tokens.text} />
                )}
                <Text style={{ color: tokens.text, fontSize: 13.5, fontFamily: fonts.heading }}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  safe: { width: '100%' },
  sheet: {
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    paddingTop: 14,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  closeBtn: { alignSelf: 'flex-end', padding: 4 },
  iconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  filename: { fontSize: 14.5, fontFamily: fonts.label, textAlign: 'center', marginTop: 12, marginBottom: 18 },
  actions: { flexDirection: 'row', gap: 12, width: '100%' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: radii.control },
});
