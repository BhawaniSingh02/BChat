import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveImageToDevice } from '../utils/openFile';

export default function ImageViewerModal({ url, onClose }: { url: string | null; onClose: () => void }) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!url) return;
    setIsSaving(true);
    try {
      const saved = await saveImageToDevice(url);
      if (saved) {
        Alert.alert('Saved', 'Photo was saved to your gallery.');
      } else {
        Alert.alert('Permission needed', 'Allow photo access to save images.');
      }
    } catch {
      Alert.alert('Could not save photo', 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={!!url} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Feather name="x" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} hitSlop={12} disabled={isSaving}>
              {isSaving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Feather name="download" size={20} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.imageWrap} activeOpacity={1} onPress={onClose}>
            {url ? <Image source={{ uri: url }} style={styles.image} resizeMode="contain" /> : null}
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  imageWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
});
