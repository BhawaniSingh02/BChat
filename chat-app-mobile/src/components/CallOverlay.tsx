import { Feather } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from './Avatar';
import { useCallStore } from '../store/callStore';
import { fonts } from '../theme/tokens';

/** Keeps the screen from sleeping for as long as this is mounted — only rendered during an active call. */
function KeepAwakeDuringCall() {
  useKeepAwake('baaat-active-call');
  return null;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function useElapsedSeconds(active: boolean): string {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active]);
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const ACCENT = '#0D9488';
const DANGER = '#DC5B4E';
const SUCCESS = '#34D399';

function RoundButton({ icon, color, onPress, size = 60, iconColor = '#FFFFFF' }: {
  icon: keyof typeof Feather.glyphMap;
  color: string;
  onPress: () => void;
  size?: number;
  iconColor?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}
    >
      <Feather name={icon} size={size * 0.42} color={iconColor} />
    </TouchableOpacity>
  );
}

export default function CallOverlay() {
  const {
    callState,
    otherUser,
    otherUsername,
    callType,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    isFrontCamera,
    remoteMuted,
    busyReason,
    acceptCall,
    declineCall,
    hangUp,
    toggleMute,
    toggleCamera,
    switchCamera,
  } = useCallStore();

  const visible = callState !== 'idle';
  const name = otherUser?.displayName || otherUser?.uniqueHandle || otherUsername || '';
  const isVideo = callType === 'VIDEO';
  const elapsed = useElapsedSeconds(callState === 'active');

  // Which stream is fullscreen vs the small corner tile — tapping the small one swaps them,
  // WhatsApp-style, so either party's video can be made the main view.
  const [pipIsLocal, setPipIsLocal] = useState(true);

  // A fresh call always starts with "my video small, their video big" — reset so a new call
  // doesn't inherit the swap state left over from a previous one.
  useEffect(() => {
    if (callState === 'idle') setPipIsLocal(true);
  }, [callState]);

  if (!visible) return null;

  const mainStream = pipIsLocal ? remoteStream : localStream;
  const pipStream = pipIsLocal ? localStream : remoteStream;
  const mainIsLocal = !pipIsLocal;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        {callState === 'active' ? <KeepAwakeDuringCall /> : null}
        <SafeAreaView style={styles.safe}>
          {callState === 'active' && isVideo && mainStream && !(mainIsLocal && isCameraOff) ? (
            <RTCView
              streamURL={mainStream.toURL()}
              style={StyleSheet.absoluteFillObject}
              objectFit="cover"
              mirror={mainIsLocal && isFrontCamera}
            />
          ) : null}

          {callState === 'active' && isVideo && pipStream && !(!mainIsLocal && isCameraOff) ? (
            <TouchableOpacity
              style={styles.pip}
              activeOpacity={0.85}
              onPress={() => setPipIsLocal((v) => !v)}
            >
              <RTCView
                streamURL={pipStream.toURL()}
                style={StyleSheet.absoluteFillObject}
                objectFit="cover"
                mirror={!mainIsLocal && isFrontCamera}
                zOrder={1}
              />
            </TouchableOpacity>
          ) : null}

          <View style={styles.centerContent} pointerEvents="box-none">
            {callState !== 'active' || !isVideo || !mainStream ? (
              <View style={styles.identity}>
                <Avatar initials={initialsFor(name || '?')} color={ACCENT} textColor="#FFFFFF" size={96} imageUrl={otherUser?.avatarUrl} />
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.status}>
                  {callState === 'ringing_incoming' && `Incoming ${isVideo ? 'video' : 'audio'} call`}
                  {callState === 'ringing_outgoing' && 'Calling…'}
                  {callState === 'active' && (remoteMuted ? `${elapsed} · muted` : elapsed)}
                  {callState === 'busy' && (busyReason || 'User is busy')}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.controls}>
            {callState === 'ringing_incoming' ? (
              <View style={styles.row}>
                <RoundButton icon="phone-off" color={DANGER} onPress={declineCall} />
                <RoundButton icon="phone" color={SUCCESS} onPress={acceptCall} />
              </View>
            ) : null}

            {callState === 'ringing_outgoing' ? (
              <View style={styles.row}>
                <RoundButton icon="phone-off" color={DANGER} onPress={hangUp} />
              </View>
            ) : null}

            {callState === 'active' ? (
              <View style={styles.row}>
                <RoundButton icon={isMuted ? 'mic-off' : 'mic'} color="rgba(255,255,255,0.18)" onPress={toggleMute} />
                {isVideo ? (
                  <RoundButton icon={isCameraOff ? 'video-off' : 'video'} color="rgba(255,255,255,0.18)" onPress={toggleCamera} />
                ) : null}
                {isVideo && !isCameraOff ? (
                  <RoundButton icon="refresh-cw" color="rgba(255,255,255,0.18)" onPress={switchCamera} />
                ) : null}
                <RoundButton icon="phone-off" color={DANGER} onPress={hangUp} />
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0A0C0D' },
  safe: { flex: 1, justifyContent: 'space-between' },
  pip: { position: 'absolute', top: 60, right: 20, width: 96, height: 140, borderRadius: 14, overflow: 'hidden', backgroundColor: '#1C2022' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  identity: { alignItems: 'center', gap: 12 },
  name: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.5 },
  status: { color: 'rgba(255,255,255,0.65)', fontSize: 14, fontFamily: fonts.label },
  controls: { paddingBottom: 48, alignItems: 'center' },
  row: { flexDirection: 'row', gap: 28, alignItems: 'center', justifyContent: 'center' },
});
