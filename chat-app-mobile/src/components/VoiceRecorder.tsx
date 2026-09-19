import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { PickedFile, uploadApi } from '../api/upload';
import { ThemeTokens } from '../theme/tokens';

const MAX_DURATION_SECONDS = 120;
const WAVEFORM_POINTS = 40;

interface Props {
  tokens: ThemeTokens;
  onSend: (url: string, durationSeconds: number, waveform: number[]) => void;
  onCancel: () => void;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Downsamples the per-tick metering levels (0-1) collected during recording into a
 * fixed number of normalized (0-100) amplitude peaks, for a static waveform at playback. */
function computeWaveformFromSamples(samples: number[], points = WAVEFORM_POINTS): number[] {
  if (samples.length === 0) return [];
  const blockSize = Math.max(1, Math.floor(samples.length / points));
  const raw: number[] = [];
  for (let i = 0; i < points; i++) {
    const block = samples.slice(i * blockSize, i * blockSize + blockSize);
    raw.push(block.length ? block.reduce((a, b) => a + b, 0) / block.length : 0);
  }
  const max = Math.max(...raw, 0.0001);
  return raw.map((v) => Math.round((v / max) * 100));
}

export default function VoiceRecorder({ tokens, onSend, onCancel }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const cancelledRef = useRef(false);
  const sentRef = useRef(false);
  const meteringSamplesRef = useRef<number[]>([]);
  // Retained after a failed upload so the user can retry without re-recording
  const recordedUriRef = useRef<string | null>(null);
  const recordedDurationRef = useRef(0);
  const recordedWaveformRef = useRef<number[]>([]);

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
              const lvl = Math.max(0, Math.min(1, (status.metering + 50) / 50));
              setLevel(lvl);
              meteringSamplesRef.current.push(lvl);
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

  const attemptUpload = async (uri: string, durationSeconds: number, waveform: number[]) => {
    setIsUploading(true);
    setError(null);
    try {
      const file: PickedFile = { uri, name: `voice-${Date.now()}.m4a`, mimeType: 'audio/mp4' };
      const result = await uploadApi.uploadFile(file);
      onSend(result.url, durationSeconds, waveform);
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed. Please try again.');
      setIsUploading(false);
    }
  };

  const handleSend = async () => {
    const recording = recordingRef.current;
    if (!recording || isUploading) return;
    sentRef.current = true;
    recordingRef.current = null;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error('Recording failed.');
      const waveform = computeWaveformFromSamples(meteringSamplesRef.current);
      recordedUriRef.current = uri;
      recordedDurationRef.current = elapsed;
      recordedWaveformRef.current = waveform;
      await attemptUpload(uri, elapsed, waveform);
    } catch (err: any) {
      sentRef.current = false;
      setError(err?.message ?? 'Recording failed.');
      setIsUploading(false);
    }
  };

  const handleRetry = () => {
    if (!recordedUriRef.current || isUploading) return;
    attemptUpload(recordedUriRef.current, recordedDurationRef.current, recordedWaveformRef.current);
  };

  useEffect(() => {
    if (elapsed >= MAX_DURATION_SECONDS) handleSend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
      <TouchableOpacity testID="voice-cancel-btn" onPress={handleCancel} disabled={isUploading} hitSlop={10}>
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
        <Text testID={error ? 'voice-error' : undefined} style={{ color: error ? '#DC5B4E' : tokens.text, fontSize: 13 }} numberOfLines={1}>
          {error ?? (isUploading ? 'Sending…' : formatDuration(elapsed))}
        </Text>
      </View>
      <TouchableOpacity
        testID={error && recordedUriRef.current ? 'voice-retry-btn' : 'voice-send-btn'}
        onPress={error && recordedUriRef.current ? handleRetry : handleSend}
        disabled={isUploading || (!!error && !recordedUriRef.current)}
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: tokens.accent,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isUploading || (error && !recordedUriRef.current) ? 0.5 : 1,
        }}
      >
        {isUploading ? (
          <ActivityIndicator size="small" color={tokens.onAccent} />
        ) : error && recordedUriRef.current ? (
          <Feather name="refresh-cw" size={16} color={tokens.onAccent} />
        ) : (
          <Feather name="arrow-right" size={16} color={tokens.onAccent} />
        )}
      </TouchableOpacity>
    </View>
  );
}
