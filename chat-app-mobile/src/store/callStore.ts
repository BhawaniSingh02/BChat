import CallAudioRouter from '../../modules/call-audio-router/src/CallAudioRouterModule';
import { MediaStream } from 'react-native-webrtc';
import { create } from 'zustand';
import { startRingtone, stopRingtone } from '../notifications/ringtone';
import { CallManager } from '../realtime/webrtc';
import { socketManager } from '../realtime/socket';
import { useUserCacheStore } from './userCacheStore';
import { CallEvent, CallState, CallType, UserSummary } from '../types';

const RING_TIMEOUT_MS = 60_000;

/**
 * react-native-webrtc drives its own native audio session independently of anything
 * in the JS layer. CallAudioRouter is a small local Expo module (modules/call-audio-router)
 * written specifically for this — react-native-incall-manager was tried first but relies
 * on the legacy NativeModules bridge, which never linked under this app's New Architecture
 * setup and silently broke incoming call audio entirely. This module uses Expo's
 * JSI-based requireNativeModule, which this project's architecture actually supports.
 *
 * Timing matters: this must run AFTER the peer connection reaches 'connected' (see
 * CallManager's onConnected callback), not eagerly before manager.startCall/answerCall.
 * getUserMedia and connection setup inside those calls make WebRTC's own native audio
 * engine (re)configure the shared AudioManager session — calling this any earlier just
 * gets silently clobbered once that init runs, which is why the receive side kept
 * failing even after the routing config appeared to be set correctly.
 */
function startCallAudioSession(): void {
  CallAudioRouter.startCallAudio();
}

function stopCallAudioSession(): void {
  CallAudioRouter.stopCallAudio();
}

// Internal orchestration state that isn't UI-relevant doesn't belong in the zustand
// store's public shape — mirrors how chat-app-frontend's useWebRTC.ts keeps its ICE
// candidate buffers in refs rather than in callStore.ts's exported state.
let manager: CallManager | null = null;
let ringTimer: ReturnType<typeof setTimeout> | null = null;
let pendingOutgoingIce: string[] = [];
let pendingIceBeforeAccept: string[] = [];

function clearRingTimer() {
  if (ringTimer) clearTimeout(ringTimer);
  ringTimer = null;
}

interface CallStoreState {
  callState: CallState;
  callSessionId: string | null;
  conversationId: string | null;
  otherUsername: string | null;
  otherUser: UserSummary | null;
  callType: CallType | null;
  pendingSdp: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isFrontCamera: boolean;
  remoteMuted: boolean;
  remoteCameraOff: boolean;
  busyReason: string | null;
  error: string | null;

  initCallListener: () => void;
  startOutgoingCall: (conversationId: string, otherUsername: string, callType: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  hangUp: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  switchCamera: () => void;
  clearError: () => void;
}

function reset(): Partial<CallStoreState> {
  manager?.cleanup();
  manager = null;
  clearRingTimer();
  pendingOutgoingIce = [];
  pendingIceBeforeAccept = [];
  stopRingtone();
  stopCallAudioSession();
  return {
    callState: 'idle',
    callSessionId: null,
    conversationId: null,
    otherUsername: null,
    otherUser: null,
    callType: null,
    pendingSdp: null,
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isCameraOff: false,
    isFrontCamera: true,
    remoteMuted: false,
    remoteCameraOff: false,
    busyReason: null,
  };
}

export const useCallStore = create<CallStoreState>((set, get) => ({
  callState: 'idle',
  callSessionId: null,
  conversationId: null,
  otherUsername: null,
  otherUser: null,
  callType: null,
  pendingSdp: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,
  isFrontCamera: true,
  remoteMuted: false,
  remoteCameraOff: false,
  busyReason: null,
  error: null,

  initCallListener: () => {
    socketManager.onCallEvent((event) => handleCallEvent(event, set, get));
  },

  startOutgoingCall: async (conversationId, otherUsername, callType) => {
    if (get().callState !== 'idle') return;

    useUserCacheStore
      .getState()
      .getUser(otherUsername)
      .then((otherUser) => {
        if (get().conversationId === conversationId) set({ otherUser });
      });

    set({
      callState: 'ringing_outgoing',
      conversationId,
      otherUsername,
      callType,
      error: null,
    });

    manager = new CallManager({
      onLocalIceCandidate: (candidateJson) => {
        const sessionId = get().callSessionId;
        const convId = get().conversationId;
        if (sessionId && convId) {
          socketManager.sendIceCandidate(convId, sessionId, candidateJson);
        } else {
          pendingOutgoingIce.push(candidateJson);
        }
      },
      onRemoteStream: (stream) => set({ remoteStream: stream }),
      onConnectionFailed: () => get().hangUp(),
      onConnected: () => startCallAudioSession(),
    });

    try {
      const { stream, sdpOffer } = await manager.startCall(callType === 'VIDEO');
      set({ localStream: stream });
      socketManager.sendCallOffer(conversationId, callType, sdpOffer);
    } catch (err: any) {
      set({ ...reset(), error: err?.message ?? 'Could not access camera/microphone.' });
    }
  },

  acceptCall: async () => {
    const state = get();
    if (state.callState !== 'ringing_incoming' || !state.conversationId || !state.callSessionId || !state.pendingSdp) return;
    const { conversationId, callSessionId, pendingSdp, callType } = state;
    clearRingTimer();
    stopRingtone();

    manager = new CallManager({
      onLocalIceCandidate: (candidateJson) => {
        socketManager.sendIceCandidate(conversationId, callSessionId, candidateJson);
      },
      onRemoteStream: (stream) => set({ remoteStream: stream }),
      onConnectionFailed: () => get().hangUp(),
      onConnected: () => startCallAudioSession(),
    });

    try {
      const { stream, sdpAnswer } = await manager.answerCall(pendingSdp, callType === 'VIDEO');
      set({ localStream: stream });

      const buffered = pendingIceBeforeAccept;
      pendingIceBeforeAccept = [];
      for (const candidateJson of buffered) {
        await manager.addRemoteIceCandidate(candidateJson);
      }

      socketManager.sendCallAnswer(conversationId, callSessionId, sdpAnswer);
      set({ callState: 'active' });
    } catch (err: any) {
      socketManager.sendCallEnd(conversationId, callSessionId);
      set({ ...reset(), error: err?.message ?? 'Could not access camera/microphone.' });
    }
  },

  declineCall: () => {
    const { conversationId, callSessionId } = get();
    if (conversationId && callSessionId) socketManager.sendCallEnd(conversationId, callSessionId);
    set(reset());
  },

  hangUp: () => {
    const { conversationId, callSessionId } = get();
    if (conversationId && callSessionId) {
      socketManager.sendCallEnd(conversationId, callSessionId);
    } else if (conversationId) {
      socketManager.sendCallCancel(conversationId);
    }
    set(reset());
  },

  toggleMute: () => {
    const nextMuted = !get().isMuted;
    manager?.setAudioEnabled(!nextMuted);
    const { conversationId, callSessionId } = get();
    if (conversationId && callSessionId) socketManager.sendCallMuteStatus(conversationId, callSessionId, 'audio', nextMuted);
    set({ isMuted: nextMuted });
  },

  toggleCamera: () => {
    const nextOff = !get().isCameraOff;
    manager?.setVideoEnabled(!nextOff);
    const { conversationId, callSessionId } = get();
    if (conversationId && callSessionId) socketManager.sendCallMuteStatus(conversationId, callSessionId, 'video', nextOff);
    set({ isCameraOff: nextOff });
  },

  switchCamera: () => {
    manager?.switchCamera();
    set({ isFrontCamera: !get().isFrontCamera });
  },

  clearError: () => set({ error: null }),
}));

function handleCallEvent(
  event: CallEvent,
  set: (partial: Partial<CallStoreState>) => void,
  get: () => CallStoreState,
) {
  switch (event.eventType) {
    case 'CALL_SESSION_CREATED': {
      if (get().conversationId !== event.conversationId) return;
      set({ callSessionId: event.callSessionId });
      const buffered = pendingOutgoingIce;
      pendingOutgoingIce = [];
      buffered.forEach((candidateJson) => socketManager.sendIceCandidate(event.conversationId, event.callSessionId, candidateJson));
      break;
    }

    case 'INCOMING_CALL': {
      if (get().callState !== 'idle') return; // already on a call — server-side busy check covers cross-device races
      useUserCacheStore
        .getState()
        .getUser(event.fromUsername)
        .then((otherUser) => {
          if (get().callSessionId === event.callSessionId) set({ otherUser });
        });
      set({
        callState: 'ringing_incoming',
        callSessionId: event.callSessionId,
        conversationId: event.conversationId,
        otherUsername: event.fromUsername,
        callType: event.callType,
        pendingSdp: event.payload ?? null,
      });
      startRingtone();
      clearRingTimer();
      ringTimer = setTimeout(() => {
        if (get().callState === 'ringing_incoming') get().declineCall();
      }, RING_TIMEOUT_MS);
      break;
    }

    case 'CALL_ANSWERED': {
      if (get().callState !== 'ringing_outgoing' || get().callSessionId !== event.callSessionId) return;
      manager
        ?.setRemoteAnswer(event.payload ?? '')
        .then(() => set({ callState: 'active' }))
        .catch(() => get().hangUp());
      break;
    }

    case 'ICE_CANDIDATE': {
      if (get().callSessionId !== event.callSessionId) return;
      if (manager) {
        manager.addRemoteIceCandidate(event.payload ?? '');
      } else if (get().callState === 'ringing_incoming') {
        pendingIceBeforeAccept.push(event.payload ?? '');
      }
      break;
    }

    case 'CALL_ENDED': {
      if (get().callSessionId !== event.callSessionId && get().conversationId !== event.conversationId) return;
      set(reset());
      break;
    }

    case 'CALL_BUSY': {
      if (get().conversationId !== event.conversationId) return;
      manager?.cleanup();
      manager = null;
      set({ callState: 'busy', busyReason: event.payload ?? 'User is busy.' });
      setTimeout(() => {
        if (get().callState === 'busy') set(reset());
      }, 4000);
      break;
    }

    case 'MUTE_STATUS': {
      if (get().callSessionId !== event.callSessionId) return;
      try {
        const { kind, muted } = JSON.parse(event.payload ?? '{}');
        if (kind === 'audio') set({ remoteMuted: !!muted });
        else if (kind === 'video') set({ remoteCameraOff: !!muted });
      } catch {
        // ignore malformed mute payloads
      }
      break;
    }

    default:
      break;
  }
}
