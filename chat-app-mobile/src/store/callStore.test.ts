import CallAudioRouter from '../../modules/call-audio-router/src/CallAudioRouterModule';
import { RTCPeerConnection } from 'react-native-webrtc';
import { startRingtone } from '../notifications/ringtone';
import { socketManager } from '../realtime/socket';
import { useCallStore } from './callStore';
import type { CallEvent } from '../types';

jest.mock('../realtime/socket', () => ({
  socketManager: {
    onCallEvent: jest.fn(),
    sendCallOffer: jest.fn(),
    sendCallAnswer: jest.fn(),
    sendIceCandidate: jest.fn(),
    sendCallEnd: jest.fn(),
    sendCallCancel: jest.fn(),
    sendCallMuteStatus: jest.fn(),
  },
}));

jest.mock('../notifications/ringtone', () => ({
  startRingtone: jest.fn(),
  stopRingtone: jest.fn(),
}));

jest.mock('./userCacheStore', () => ({
  useUserCacheStore: { getState: () => ({ getUser: jest.fn().mockResolvedValue(null) }) },
}));

jest.mock('../../modules/call-audio-router/src/CallAudioRouterModule', () => ({
  __esModule: true,
  default: {
    startCallAudio: jest.fn(),
    stopCallAudio: jest.fn(),
    setSpeakerphoneOn: jest.fn(),
  },
}));

// Keep tests hermetic — see webrtc.test.ts; the real implementation makes a network
// request to the backend before falling back to STUN-only.
jest.mock('../realtime/iceServers', () => ({
  getIceServers: jest.fn().mockResolvedValue([{ urls: 'stun:stun.test:19302' }]),
}));

/** Flushes both microtasks and one macrotask turn — enough for the fire-and-forget async chains inside callStore's event handlers to settle before assertions run. */
function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function emitCallEvent(event: CallEvent) {
  const handler = (socketManager.onCallEvent as jest.Mock).mock.calls[0][0];
  handler(event);
  return flush();
}

/** Simulates the most-recently-created RTCPeerConnection reaching the 'connected' state — the point at which callStore applies the call audio session config. */
function simulateConnected() {
  const pc = (RTCPeerConnection as unknown as jest.Mock).mock.results.at(-1)!.value;
  pc.connectionState = 'connected';
  pc.onconnectionstatechange();
}

const baseEvent = { fromUsername: 'bob', callType: 'AUDIO' as const };

beforeEach(() => {
  jest.clearAllMocks();
  useCallStore.getState().initCallListener();
});

afterEach(() => {
  useCallStore.getState().hangUp();
});

describe('startOutgoingCall', () => {
  it('moves to ringing_outgoing and sends a call offer', async () => {
    await useCallStore.getState().startOutgoingCall('conv1', 'bob', 'AUDIO');

    const state = useCallStore.getState();
    expect(state.callState).toBe('ringing_outgoing');
    expect(state.callType).toBe('AUDIO');
    expect(socketManager.sendCallOffer).toHaveBeenCalledWith('conv1', 'AUDIO', expect.any(String));
  });

  it('does not start the native call audio session before the connection is actually up', async () => {
    // Regression test: this must NOT fire eagerly before/during getUserMedia, since
    // WebRTC's own native audio engine init (inside manager.startCall) clobbers
    // whatever was configured before it runs — that's what silently broke incoming
    // call audio previously. It must only apply once the connection is truly live.
    await useCallStore.getState().startOutgoingCall('conv1', 'bob', 'AUDIO');
    expect(CallAudioRouter.startCallAudio).not.toHaveBeenCalled();
  });

  it('starts the native call audio session once the connection is established, for audio calls', async () => {
    await useCallStore.getState().startOutgoingCall('conv1', 'bob', 'AUDIO');
    simulateConnected();
    expect(CallAudioRouter.startCallAudio).toHaveBeenCalled();
  });

  it('starts the native call audio session once the connection is established, for video calls too', async () => {
    await useCallStore.getState().startOutgoingCall('conv1', 'bob', 'VIDEO');
    simulateConnected();
    expect(CallAudioRouter.startCallAudio).toHaveBeenCalled();
  });

  it('stops the native call audio session once the call resets', async () => {
    await useCallStore.getState().startOutgoingCall('conv1', 'bob', 'AUDIO');
    simulateConnected();
    useCallStore.getState().hangUp();
    expect(CallAudioRouter.stopCallAudio).toHaveBeenCalled();
  });

  it('is a no-op if already in a call', async () => {
    await useCallStore.getState().startOutgoingCall('conv1', 'bob', 'AUDIO');
    (socketManager.sendCallOffer as jest.Mock).mockClear();

    await useCallStore.getState().startOutgoingCall('conv2', 'carol', 'VIDEO');

    expect(socketManager.sendCallOffer).not.toHaveBeenCalled();
    expect(useCallStore.getState().conversationId).toBe('conv1');
  });
});

describe('CALL_SESSION_CREATED', () => {
  it('attaches the session id once the server assigns one', async () => {
    await useCallStore.getState().startOutgoingCall('conv1', 'bob', 'AUDIO');
    await emitCallEvent({ eventType: 'CALL_SESSION_CREATED', callSessionId: 'sess1', conversationId: 'conv1', ...baseEvent });

    expect(useCallStore.getState().callSessionId).toBe('sess1');
  });

  it('ignores a session id for a conversation that is not the active call', async () => {
    await useCallStore.getState().startOutgoingCall('conv1', 'bob', 'AUDIO');
    await emitCallEvent({ eventType: 'CALL_SESSION_CREATED', callSessionId: 'sess-stale', conversationId: 'conv-other', ...baseEvent });

    expect(useCallStore.getState().callSessionId).toBeNull();
  });
});

describe('incoming call flow', () => {
  it('INCOMING_CALL rings and starts the ringtone', async () => {
    await emitCallEvent({
      eventType: 'INCOMING_CALL',
      callSessionId: 'sess1',
      conversationId: 'conv1',
      payload: JSON.stringify({ type: 'offer', sdp: 'x' }),
      ...baseEvent,
    });

    const state = useCallStore.getState();
    expect(state.callState).toBe('ringing_incoming');
    expect(state.callType).toBe('AUDIO');
    expect(startRingtone).toHaveBeenCalled();
  });

  it('ignores a second INCOMING_CALL while already ringing on one', async () => {
    await emitCallEvent({ eventType: 'INCOMING_CALL', callSessionId: 'sess1', conversationId: 'conv1', ...baseEvent });
    await emitCallEvent({ eventType: 'INCOMING_CALL', callSessionId: 'sess2', conversationId: 'conv2', fromUsername: 'carol', callType: 'VIDEO' });

    expect(useCallStore.getState().callSessionId).toBe('sess1');
  });

  it('auto-declines after the ring timeout elapses', async () => {
    jest.useFakeTimers();
    try {
      const handler = (socketManager.onCallEvent as jest.Mock).mock.calls[0][0];
      handler({ eventType: 'INCOMING_CALL', callSessionId: 'sess1', conversationId: 'conv1', ...baseEvent });

      jest.advanceTimersByTime(60_000);

      expect(useCallStore.getState().callState).toBe('idle');
      expect(socketManager.sendCallEnd).toHaveBeenCalledWith('conv1', 'sess1');
    } finally {
      jest.useRealTimers();
    }
  });

  it('acceptCall answers and goes active', async () => {
    await emitCallEvent({
      eventType: 'INCOMING_CALL',
      callSessionId: 'sess1',
      conversationId: 'conv1',
      payload: JSON.stringify({ type: 'offer', sdp: 'x' }),
      ...baseEvent,
    });

    await useCallStore.getState().acceptCall();

    expect(useCallStore.getState().callState).toBe('active');
    expect(socketManager.sendCallAnswer).toHaveBeenCalledWith('conv1', 'sess1', expect.any(String));
  });

  it('configures speaker routing once the answered connection is established', async () => {
    await emitCallEvent({
      eventType: 'INCOMING_CALL',
      callSessionId: 'sess1',
      conversationId: 'conv1',
      payload: JSON.stringify({ type: 'offer', sdp: 'x' }),
      ...baseEvent,
    });

    await useCallStore.getState().acceptCall();
    simulateConnected();

    expect(CallAudioRouter.startCallAudio).toHaveBeenCalled();
  });

  it('flushes ICE candidates that arrived while still ringing, once accepted', async () => {
    await emitCallEvent({
      eventType: 'INCOMING_CALL',
      callSessionId: 'sess1',
      conversationId: 'conv1',
      payload: JSON.stringify({ type: 'offer', sdp: 'x' }),
      ...baseEvent,
    });
    await emitCallEvent({
      eventType: 'ICE_CANDIDATE',
      callSessionId: 'sess1',
      conversationId: 'conv1',
      payload: JSON.stringify({ candidate: 'early' }),
      ...baseEvent,
    });

    await expect(useCallStore.getState().acceptCall()).resolves.toBeUndefined();
    expect(useCallStore.getState().callState).toBe('active');
  });

  it('acceptCall is a no-op without a ringing incoming call', async () => {
    await useCallStore.getState().acceptCall();
    expect(useCallStore.getState().callState).toBe('idle');
    expect(socketManager.sendCallAnswer).not.toHaveBeenCalled();
  });
});

describe('caller side answer', () => {
  it('CALL_ANSWERED moves ringing_outgoing to active', async () => {
    await useCallStore.getState().startOutgoingCall('conv1', 'bob', 'VIDEO');
    await emitCallEvent({ eventType: 'CALL_SESSION_CREATED', callSessionId: 'sess1', conversationId: 'conv1', ...baseEvent, callType: 'VIDEO' });

    await emitCallEvent({
      eventType: 'CALL_ANSWERED',
      callSessionId: 'sess1',
      conversationId: 'conv1',
      payload: JSON.stringify({ type: 'answer', sdp: 'y' }),
      fromUsername: 'bob',
      callType: 'VIDEO',
    });

    expect(useCallStore.getState().callState).toBe('active');
  });

  it('ignores a CALL_ANSWERED for a stale/unrelated session id', async () => {
    await useCallStore.getState().startOutgoingCall('conv1', 'bob', 'AUDIO');
    await emitCallEvent({ eventType: 'CALL_SESSION_CREATED', callSessionId: 'sess1', conversationId: 'conv1', ...baseEvent });

    await emitCallEvent({ eventType: 'CALL_ANSWERED', callSessionId: 'wrong-session', conversationId: 'conv1', payload: '{}', ...baseEvent });

    expect(useCallStore.getState().callState).toBe('ringing_outgoing');
  });
});

describe('ending a call', () => {
  it('hangUp during an active call sends CALL_END and resets to idle', async () => {
    await useCallStore.getState().startOutgoingCall('conv1', 'bob', 'AUDIO');
    await emitCallEvent({ eventType: 'CALL_SESSION_CREATED', callSessionId: 'sess1', conversationId: 'conv1', ...baseEvent });

    useCallStore.getState().hangUp();

    expect(socketManager.sendCallEnd).toHaveBeenCalledWith('conv1', 'sess1');
    expect(useCallStore.getState().callState).toBe('idle');
  });

  it('hangUp before a session id exists sends CALL_CANCEL instead', async () => {
    await useCallStore.getState().startOutgoingCall('conv1', 'bob', 'AUDIO');

    useCallStore.getState().hangUp();

    expect(socketManager.sendCallCancel).toHaveBeenCalledWith('conv1');
    expect(socketManager.sendCallEnd).not.toHaveBeenCalled();
  });

  it('declineCall sends CALL_END and resets to idle', async () => {
    await emitCallEvent({ eventType: 'INCOMING_CALL', callSessionId: 'sess1', conversationId: 'conv1', ...baseEvent });

    useCallStore.getState().declineCall();

    expect(socketManager.sendCallEnd).toHaveBeenCalledWith('conv1', 'sess1');
    expect(useCallStore.getState().callState).toBe('idle');
  });

  it('CALL_ENDED from the remote side resets state to idle', async () => {
    await useCallStore.getState().startOutgoingCall('conv1', 'bob', 'AUDIO');
    await emitCallEvent({ eventType: 'CALL_SESSION_CREATED', callSessionId: 'sess1', conversationId: 'conv1', ...baseEvent });

    await emitCallEvent({ eventType: 'CALL_ENDED', callSessionId: 'sess1', conversationId: 'conv1', ...baseEvent });

    expect(useCallStore.getState().callState).toBe('idle');
  });

  it('CALL_BUSY shows a busy state and auto-resets after a few seconds', async () => {
    jest.useFakeTimers();
    try {
      await useCallStore.getState().startOutgoingCall('conv1', 'bob', 'AUDIO');
      const handler = (socketManager.onCallEvent as jest.Mock).mock.calls[0][0];
      handler({ eventType: 'CALL_BUSY', callSessionId: '', conversationId: 'conv1', payload: 'Busy on another call', ...baseEvent });

      expect(useCallStore.getState().callState).toBe('busy');
      expect(useCallStore.getState().busyReason).toBe('Busy on another call');

      jest.advanceTimersByTime(4000);

      expect(useCallStore.getState().callState).toBe('idle');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('mute and camera', () => {
  it('toggleMute flips isMuted and broadcasts the new status', async () => {
    await useCallStore.getState().startOutgoingCall('conv1', 'bob', 'AUDIO');
    await emitCallEvent({ eventType: 'CALL_SESSION_CREATED', callSessionId: 'sess1', conversationId: 'conv1', ...baseEvent });

    useCallStore.getState().toggleMute();

    expect(useCallStore.getState().isMuted).toBe(true);
    expect(socketManager.sendCallMuteStatus).toHaveBeenCalledWith('conv1', 'sess1', 'audio', true);
  });

  it('MUTE_STATUS from the remote side updates remoteMuted, not remoteCameraOff', async () => {
    await useCallStore.getState().startOutgoingCall('conv1', 'bob', 'AUDIO');
    await emitCallEvent({ eventType: 'CALL_SESSION_CREATED', callSessionId: 'sess1', conversationId: 'conv1', ...baseEvent });

    await emitCallEvent({
      eventType: 'MUTE_STATUS',
      callSessionId: 'sess1',
      conversationId: 'conv1',
      payload: JSON.stringify({ kind: 'audio', muted: true }),
      ...baseEvent,
    });

    expect(useCallStore.getState().remoteMuted).toBe(true);
    expect(useCallStore.getState().remoteCameraOff).toBe(false);
  });

  it('MUTE_STATUS with kind "video" updates remoteCameraOff, not remoteMuted', async () => {
    await useCallStore.getState().startOutgoingCall('conv1', 'bob', 'VIDEO');
    await emitCallEvent({ eventType: 'CALL_SESSION_CREATED', callSessionId: 'sess1', conversationId: 'conv1', ...baseEvent, callType: 'VIDEO' });

    await emitCallEvent({
      eventType: 'MUTE_STATUS',
      callSessionId: 'sess1',
      conversationId: 'conv1',
      payload: JSON.stringify({ kind: 'video', muted: true }),
      fromUsername: 'bob',
      callType: 'VIDEO',
    });

    expect(useCallStore.getState().remoteCameraOff).toBe(true);
    expect(useCallStore.getState().remoteMuted).toBe(false);
  });
});
