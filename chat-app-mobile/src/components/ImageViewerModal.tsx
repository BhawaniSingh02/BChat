import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, Modal, NativeSyntheticEvent, NativeScrollEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveImageToDevice } from '../utils/openFile';

interface Props {
  /** Empty array = modal is closed. */
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

function clampIndex(index: number, length: number): number {
  return Math.min(Math.max(index, 0), Math.max(length - 1, 0));
}

/**
 * Full-screen tap-to-view image viewer. Swipe left/right to move between images when opened
 * with more than one (e.g. from a grouped photo burst) — a single image behaves exactly as
 * before (tap to close, download button).
 */
export default function ImageViewerModal({ images, initialIndex = 0, onClose }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [index, setIndex] = useState(clampIndex(initialIndex, images.length));
  const listRef = useRef<FlatList<string>>(null);
  const visible = images.length > 0;
  const screenWidth = Dimensions.get('window').width;

  // Reset to the requested index whenever the modal is (re)opened with a new image set.
  useEffect(() => {
    if (visible) setIndex(clampIndex(initialIndex, images.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialIndex, images.length]);

  const currentUrl = images[index];

  const handleSave = async () => {
    if (!currentUrl) return;
    setIsSaving(true);
    try {
      const saved = await saveImageToDevice(currentUrl);
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

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(clampIndex(Math.round(e.nativeEvent.contentOffset.x / screenWidth), images.length));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} hitSlop={12} testID="image-viewer-close">
              <Feather name="x" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            {images.length > 1 ? (
              <Text style={styles.counter} testID="image-viewer-counter">{index + 1} / {images.length}</Text>
            ) : null}
            <TouchableOpacity onPress={handleSave} hitSlop={12} disabled={isSaving} testID="image-viewer-save">
              {isSaving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Feather name="download" size={20} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
          {visible ? (
            <FlatList
              ref={listRef}
              data={images}
              keyExtractor={(item, i) => `${item}-${i}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={index}
              getItemLayout={(_data, i) => ({ length: screenWidth, offset: screenWidth * i, index: i })}
              onMomentumScrollEnd={handleMomentumScrollEnd}
              testID="image-viewer-list"
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.imageWrap, { width: screenWidth }]} activeOpacity={1} onPress={onClose}>
                  <Image source={{ uri: item }} style={styles.image} resizeMode="contain" testID="image-viewer-image" />
                </TouchableOpacity>
              )}
            />
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  counter: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  imageWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
});
