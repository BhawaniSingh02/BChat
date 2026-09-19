import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { PickedFile, uploadApi } from '../api/upload';
import { ThemeTokens } from '../theme/tokens';

const MAX_DURATION_SECONDS = 120;

interface Props {
  tokens: ThemeTokens;
  onSend: (url: string, durationSeconds: number) => void;
  onCancel: () => void;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VoiceRecorder({ tokens, onSend, onCancel }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const cancelledRef = useRef(false);
  const sentRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const permission = await Audio.requestPermissionsAsync();
        if (!permission.granted) {
          if (mounted) setError('Microphone access is needed to record voice messages.');
          return;
        }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY,
          (status) => {
            if (!mounted) return;
            setElapsed(Math.floor(status.durationMillis / 1000));
            if (typeof status.metering === 'number') {
              // metering is roughly -50 (near silence) to 0 (loudest) dBFS in practice
              setLevel(Math.max(0, Math.min(1, (status.metering + 50) / 50)));
            }
          },
          200,
        );
        if (!mounted || cancelledRef.current) {
          await recording.stopAndUnloadAsync().catch(() => {});
          return;
        }
        recordingRef.current = recording;
      } catch {
        if (mounted) setError('Could not start recording. Please try again.');
      }
    })();
    return () => {
      mounted = false;
      cancelledRef.current = true;
      if (!sentRef.current) recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = async () => {
    cancelledRef.current = true;
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (recording) await recording.stopAndUnloadAsync().catch(() => {});
    onCancel();
  };

  const handleSend = async () => {
    const recording = recordingRef.current;
    if (!recording || isUploading || error) return;
    sentRef.current = true;
    recordingRef.current = null;
    setIsUploading(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error('Recording failed.');
      const file: PickedFile = { uri, name: `voice-${Date.now()}.m4a`, mimeType: 'audio/mp4' };
      const result = await uploadApi.uploadFile(file);
      onSend(result.url, elapsed);
    } catch (err: any) {
      sentRef.current = false;
      setError(err?.message ?? 'Upload failed. Please try again.');
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (elapsed >= MAX_DURATION_SECONDS) handleSend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
      <TouchableOpacity onPress={handleCancel} disabled={isUploading} hitSlop={10}>
        <Feather name="trash-2" size={20} color="#DC5B4E" />
      </TouchableOpacity>
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: tokens.surface,
          borderRadius: 20,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        {isUploading ? (
          <ActivityIndicator size="small" color={tokens.accent} />
        ) : (
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#DC5B4E', opacity: error ? 0.3 : 0.5 + level * 0.5 }} />
        )}
        <Text style={{ color: error ? '#DC5B4E' : tokens.text, fontSize: 13 }} numberOfLines={1}>
          {error ?? (isUploading ? 'Sending…' : formatDuration(elapsed))}
        </Text>
      </View>
      <TouchableOpacity
        onPress={handleSend}
        disabled={isUploading || !!error}
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: tokens.accent,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isUploading || error ? 0.5 : 1,
        }}
      >
        {isUploading ? <ActivityIndicator size="small" color={tokens.onAccent} /> : <Feather name="arrow-right" size={16} color={tokens.onAccent} />}
      </TouchableOpacity>
    </View>
  );
}
