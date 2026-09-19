import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { uploadApi } from '../api/upload';
import { useStoryStore } from '../store/storyStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii } from '../theme/tokens';
import { StoryType } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryComposer'>;

// Same gradient keys as the web app's StoryComposer (chat-app-frontend), stored
// by key on the story so both clients render the same set of backgrounds.
const BACKGROUNDS: { key: string; colors: [string, string] }[] = [
  { key: 'teal', colors: ['#14B8A6', '#0891B2'] },
  { key: 'violet', colors: ['#8B5CF6', '#C026D3'] },
  { key: 'sunset', colors: ['#F97316', '#E11D48'] },
  { key: 'slate', colors: ['#334155', '#0F172A'] },
  { key: 'emerald', colors: ['#10B981', '#15803D'] },
  { key: 'ocean', colors: ['#0EA5E9', '#4338CA'] },
];

export function gradientFor(key: string | undefined): [string, string] {
  return BACKGROUNDS.find((b) => b.key === key)?.colors ?? BACKGROUNDS[0].colors;
}

type Mode = 'text' | 'image' | 'video';

interface PickedMedia {
  uri: string;
  name: string;
  mimeType: string;
}

export default function StoryComposerScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const createStory = useStoryStore((s) => s.createStory);
  const [mode, setMode] = useState<Mode>('text');
  const [text, setText] = useState('');
  const [bg, setBg] = useState(BACKGROUNDS[0].key);
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearMedia = () => {
    setMedia(null);
    setMode('text');
  };

  const handlePickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library access is needed to share to your story.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    const isVideo = asset.type === 'video' || (asset.mimeType?.startsWith('video/') ?? false);
    setMedia({
      uri: asset.uri,
      name: asset.fileName ?? `story-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
      mimeType: asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
    });
    setMode(isVideo ? 'video' : 'image');
    setError(null);
  };

  const canShare = mode === 'text' ? !!text.trim() : !!media;

  const handleShare = async () => {
    if (posting || !canShare) return;
    setError(null);
    setPosting(true);
    try {
      if (mode === 'text') {
        await createStory({ type: 'TEXT', content: text.trim(), backgroundColor: bg });
      } else {
        const { url } = await uploadApi.uploadFile(media!);
        await createStory({
          type: (mode === 'video' ? 'VIDEO' : 'IMAGE') as StoryType,
          mediaUrl: url,
          content: text.trim() || undefined,
        });
      }
      navigation.goBack();
    } catch {
      setError(`Could not post your story. Try again.`);
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
      <View style={[styles.header, { borderBottomColor: tokens.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="x" size={22} color={tokens.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: tokens.text }]}>
          {mode === 'image' ? 'Share photo' : mode === 'video' ? 'Share video' : 'Add to your story'}
        </Text>
        <TouchableOpacity onPress={handleShare} disabled={!canShare || posting} hitSlop={12}>
          {posting ? (
            <ActivityIndicator color={tokens.accentStrong} />
          ) : (
            <Text style={{ color: canShare ? tokens.accentStrong : tokens.textMuted, fontFamily: fonts.heading, fontSize: 14 }}>
              Share
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.body}>
          {error ? <Text style={{ color: '#DC5B4E', fontSize: 12.5, fontFamily: fonts.label }}>{error}</Text> : null}

          {mode === 'text' ? (
            <>
              <LinearGradient colors={gradientFor(bg)} style={styles.textCanvas}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="Type a status…"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  maxLength={700}
                  multiline
                  style={styles.textInput}
                />
              </LinearGradient>
              <View style={styles.swatchRow}>
                {BACKGROUNDS.map((b) => (
                  <TouchableOpacity
                    key={b.key}
                    onPress={() => setBg(b.key)}
                    style={[
                      styles.swatch,
                      { borderColor: bg === b.key ? tokens.accent : 'transparent' },
                    ]}
                  >
                    <LinearGradient colors={b.colors} style={styles.swatchFill} />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={handlePickMedia}
                style={[styles.mediaBtn, { borderColor: tokens.border }]}
              >
                <Feather name="camera" size={16} color={tokens.text} />
                <Text style={{ color: tokens.text, fontFamily: fonts.label, fontSize: 13 }}>Photo / Video</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.mediaCanvas}>
              {mode === 'image' && media ? (
                <View style={styles.mediaPreviewWrap}>
                  <TouchableOpacity onPress={clearMedia} style={styles.removeBtn}>
                    <Feather name="x" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Image source={{ uri: media.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
                </View>
              ) : null}
              {mode === 'video' && media ? (
                <View style={styles.mediaPreviewWrap}>
                  <TouchableOpacity onPress={clearMedia} style={styles.removeBtn}>
                    <Feather name="x" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Video
                    source={{ uri: media.uri }}
                    style={StyleSheet.absoluteFill}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping
                  />
                </View>
              ) : null}
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Add a caption…"
                placeholderTextColor="rgba(255,255,255,0.7)"
                maxLength={300}
                style={styles.captionInput}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontFamily: fonts.heading, fontSize: 15 },
  body: { flex: 1, padding: 16, gap: 14 },
  textCanvas: {
    minHeight: 220,
    borderRadius: radii.card,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  textInput: {
    color: '#FFFFFF',
    fontFamily: fonts.heading,
    fontSize: 20,
    textAlign: 'center',
  },
  swatchRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, padding: 2 },
  swatchFill: { flex: 1, borderRadius: 12 },
  mediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.control,
    paddingVertical: 12,
  },
  mediaCanvas: { flex: 1, backgroundColor: '#000000', borderRadius: radii.card, overflow: 'hidden' },
  mediaPreviewWrap: { flex: 1 },
  removeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionInput: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
  },
});
