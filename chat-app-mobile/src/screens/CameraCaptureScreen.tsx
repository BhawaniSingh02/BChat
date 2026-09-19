import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraType, CameraView, FlashMode, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { useCameraCaptureStore } from '../store/cameraCaptureStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'CameraCapture'>;

const FLASH_CYCLE: FlashMode[] = ['off', 'on', 'auto'];
const FLASH_ICON: Record<FlashMode, keyof typeof Feather.glyphMap> = {
  off: 'zap-off',
  on: 'zap',
  auto: 'zap',
};

export default function CameraCaptureScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [capturing, setCapturing] = useState(false);
  const [photo, setPhoto] = useState<{ uri: string } | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const cycleFlash = () => {
    const next = FLASH_CYCLE[(FLASH_CYCLE.indexOf(flash) + 1) % FLASH_CYCLE.length];
    setFlash(next);
  };

  const handleCapture = async () => {
    if (capturing || !cameraRef.current) return;
    setCapturing(true);
    try {
      const result = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (result) setPhoto({ uri: result.uri });
    } finally {
      setCapturing(false);
    }
  };

  const handleUsePhoto = () => {
    if (!photo) return;
    useCameraCaptureStore.getState().setCapturedPhoto({
      uri: photo.uri,
      name: `photo-${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
    });
    navigation.goBack();
  };

  if (!permission) {
    return (
      <View style={[styles.screen, { backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
        <View style={styles.permissionWrap}>
          <Feather name="camera-off" size={40} color={tokens.textMuted} />
          <Text style={[styles.permissionTitle, { color: tokens.text }]}>Camera access needed</Text>
          <Text style={[styles.permissionBody, { color: tokens.textMuted }]}>
            Baaat needs camera access so you can take photos to send in chat.
          </Text>
          <TouchableOpacity style={[styles.grantBtn, { backgroundColor: tokens.accent }]} onPress={requestPermission}>
            <Text style={{ color: tokens.onAccent, fontFamily: fonts.heading, fontSize: 14 }}>Grant access</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 14 }}>
            <Text style={{ color: tokens.textMuted, fontSize: 13 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (photo) {
    return (
      <View style={styles.screen}>
        <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
        <SafeAreaView style={styles.overlay} pointerEvents="box-none">
          <View style={styles.confirmRow}>
            <TouchableOpacity style={styles.roundBtn} onPress={() => setPhoto(null)}>
              <Feather name="rotate-ccw" size={20} color="#FFFFFF" />
              <Text style={styles.roundBtnLabel}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.useBtn, { backgroundColor: tokens.accent }]} onPress={handleUsePhoto}>
              <Feather name="check" size={26} color={tokens.onAccent} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} flash={flash} />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} hitSlop={10}>
            <Feather name="x" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={cycleFlash} hitSlop={10}>
            <Feather name={FLASH_ICON[flash]} size={22} color="#FFFFFF" />
            {flash === 'auto' && <Text style={styles.flashAutoLabel}>A</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomRow}>
          <View style={{ width: 48 }} />
          <TouchableOpacity
            style={styles.captureOuter}
            onPress={handleCapture}
            disabled={capturing}
            hitSlop={10}
          >
            {capturing ? <ActivityIndicator color="#FFFFFF" /> : <View style={styles.captureInner} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            hitSlop={10}
          >
            <Feather name="refresh-cw" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashAutoLabel: { position: 'absolute', bottom: 4, right: 8, color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: 28,
  },
  captureOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFFFFF' },
  confirmRow: {
    flex: 1,
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 28,
  },
  roundBtn: { width: 64, alignItems: 'center', gap: 4 },
  roundBtnLabel: { color: '#FFFFFF', fontSize: 11 },
  useBtn: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  permissionWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  permissionTitle: { fontFamily: fonts.heading, fontSize: 17, marginTop: 8 },
  permissionBody: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  grantBtn: { marginTop: 14, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
});
