import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImageViewerModal from '../components/ImageViewerModal';
import { messagesApi } from '../api/messages';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import { Message } from '../types';
import { openRemoteFile } from '../utils/openFile';

type Props = NativeStackScreenProps<RootStackParamList, 'MediaGallery'>;

const COLUMNS = 3;
const GAP = 3;

function fileNameFromUrl(url: string): string {
  const last = url.split('/').pop() ?? 'file';
  return decodeURIComponent(last.split('?')[0]);
}

export default function MediaGalleryScreen({ route, navigation }: Props) {
  const { tokens } = useTheme();
  const { roomId, name } = route.params;
  const { width } = useWindowDimensions();
  const [media, setMedia] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    messagesApi
      .getMedia(roomId)
      .then(setMedia)
      .catch(() => setError('Could not load media. Pull down to retry.'))
      .finally(() => setIsLoading(false));
  }, [roomId]);

  const cellSize = (width - GAP * (COLUMNS - 1)) / COLUMNS;

  const openNonImage = async (item: Message) => {
    if (!item.fileUrl) return;
    setOpeningId(item.id);
    try {
      await openRemoteFile(item.fileUrl, fileNameFromUrl(item.fileUrl));
    } catch {
      // Sharing sheet dismissed or download failed — nothing to recover, user can retry.
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
      <View style={[styles.header, { borderBottomColor: tokens.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="chevron-left" size={22} color={tokens.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: tokens.text }]} numberOfLines={1}>Media</Text>
          <Text style={{ color: tokens.textMuted, fontSize: 11.5 }} numberOfLines={1}>{name}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={tokens.accentStrong} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={{ color: tokens.textMuted, fontSize: 13 }}>{error}</Text>
        </View>
      ) : media.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="image" size={28} color={tokens.textMuted} />
          <Text style={{ color: tokens.textMuted, fontSize: 13, marginTop: 8 }}>No shared media yet</Text>
        </View>
      ) : (
        <FlatList
          data={media}
          keyExtractor={(item) => item.id}
          numColumns={COLUMNS}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{ gap: GAP }}
          renderItem={({ item }) => {
            const isImage = item.messageType === 'IMAGE' && !!item.fileUrl;
            const isVideo = item.messageType === 'VIDEO';
            const isOpening = openingId === item.id;
            return (
              <TouchableOpacity
                style={[styles.cell, { width: cellSize, height: cellSize, backgroundColor: tokens.surface }]}
                disabled={isOpening}
                onPress={() => (isImage ? setViewerUrl(item.fileUrl!) : openNonImage(item))}
              >
                {isImage ? (
                  <Image source={{ uri: item.fileUrl }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={styles.iconCell}>
                    {isOpening ? (
                      <ActivityIndicator size="small" color={tokens.accentStrong} />
                    ) : (
                      <Feather
                        name={isVideo ? 'film' : item.messageType === 'AUDIO' ? 'mic' : 'file-text'}
                        size={22}
                        color={tokens.textMuted}
                      />
                    )}
                    <Text style={{ color: tokens.textMuted, fontSize: 10, marginTop: 4, paddingHorizontal: 4 }} numberOfLines={1}>
                      {item.fileUrl ? fileNameFromUrl(item.fileUrl) : ''}
                    </Text>
                  </View>
                )}
                {isVideo && item.fileUrl ? (
                  <View style={styles.videoBadge}>
                    <Feather name="play" size={12} color="#FFFFFF" />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}

      <ImageViewerModal url={viewerUrl} onClose={() => setViewerUrl(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontFamily: fonts.heading, fontSize: 15, letterSpacing: -0.2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  thumb: { width: '100%', height: '100%' },
  iconCell: { alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
  videoBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
