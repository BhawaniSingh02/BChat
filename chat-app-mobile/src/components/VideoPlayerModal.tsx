import { Feather } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VideoPlayerModal({ url, onClose }: { url: string | null; onClose: () => void }) {
  return (
    <Modal visible={!!url} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <Feather name="x" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.videoWrap}>
            {url ? (
              <Video
                source={{ uri: url }}
                style={styles.video}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
              />
            ) : null}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000' },
  safe: { flex: 1 },
  closeBtn: { alignSelf: 'flex-end', padding: 16, zIndex: 1 },
  videoWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  video: { width: '100%', height: '100%' },
});
