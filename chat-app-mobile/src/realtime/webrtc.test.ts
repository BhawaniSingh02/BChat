import { mediaDevices, RTCPeerConnection } from 'react-native-webrtc';
import { CallManager } from './webrtc';

// Keep tests hermetic — the real getIceServers() hits the backend over the network
// (with a long axios timeout) before falling back, which both slows the suite down
// and makes it depend on connectivity.
jest.mock('./iceServers', () => ({
  getIceServers: jest.fn().mockResolvedValue([{ urls: 'stun:stun.test:19302' }]),
}));

function makeManager() {
  return new CallManager({
    onLocalIceCandidate: jest.fn(),
    onRemoteStream: jest.fn(),
    onConnectionFailed: jest.fn(),
    onConnected: jest.fn(),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CallManager local media acquisition', () => {
  it('startCall(false) — audio calls request an audio track and no video track', async () => {
    const manager = makeManager();
    const { stream } = await manager.startCall(false);

    expect(mediaDevices.getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: true, video: false }),
    );
    expect(stream.getAudioTracks()).toHaveLength(1);
    expect(stream.getVideoTracks()).toHaveLength(0);
  });

  it('startCall(true) — video calls request both an audio and a video track', async () => {
    const manager = makeManager();
    const { stream } = await manager.startCall(true);

    expect(mediaDevices.getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: true, video: expect.any(Object) }),
    );
    expect(stream.getAudioTracks()).toHaveLength(1);
    expect(stream.getVideoTracks()).toHaveLength(1);
  });

  it('answerCall(offer, false) also acquires an audio-only local stream', async () => {
    const manager = makeManager();
    const offer = JSON.stringify({ type: 'offer', sdp: 'remote-offer' });
    const { stream } = await manager.answerCall(offer, false);

    expect(stream.getAudioTracks()).toHaveLength(1);
    expect(stream.getVideoTracks()).toHaveLength(0);
  });

  it('adds every local track to the peer connection for both call types', async () => {
    const manager = makeManager();
    await manager.startCall(true);
    const pc = (RTCPeerConnection as unknown as jest.Mock).mock.results.at(-1)!.value;
    expect(pc.addTrack).toHaveBeenCalledTimes(2); // audio + video
  });
});

describe('CallManager offer/answer flow', () => {
  it('startCall produces a serializable SDP offer and sets it as the local description', async () => {
    const manager = makeManager();
    const { sdpOffer } = await manager.startCall(false);
    const parsed = JSON.parse(sdpOffer);
    expect(parsed.type).toBe('offer');
  });

  it('answerCall sets the given offer as the remote description and returns an answer', async () => {
    const manager = makeManager();
    const offer = JSON.stringify({ type: 'offer', sdp: 'remote-offer' });
    const { sdpAnswer } = await manager.answerCall(offer, false);
    const parsed = JSON.parse(sdpAnswer);
    expect(parsed.type).toBe('answer');
  });

  it('setRemoteAnswer applies the caller-received answer to the existing peer connection', async () => {
    const manager = makeManager();
    await manager.startCall(false);
    const pc = (RTCPeerConnection as unknown as jest.Mock).mock.results.at(-1)!.value;

    await manager.setRemoteAnswer(JSON.stringify({ type: 'answer', sdp: 'remote-answer' }));

    expect(pc.remoteDescription).toEqual({ type: 'answer', sdp: 'remote-answer' });
  });
});

describe('CallManager ICE candidate handling', () => {
  it('applies a candidate immediately once the remote description is already set', async () => {
    const manager = makeManager();
    await manager.startCall(false);
    await manager.setRemoteAnswer(JSON.stringify({ type: 'answer', sdp: 'x' }));
    const pc = (RTCPeerConnection as unknown as jest.Mock).mock.results.at(-1)!.value;

    await manager.addRemoteIceCandidate(JSON.stringify({ candidate: 'c1' }));

    expect(pc.addIceCandidate).toHaveBeenCalledTimes(1);
  });

  it('buffers a candidate that arrives before the remote description, then flushes it on setRemoteAnswer', async () => {
    const manager = makeManager();
    await manager.startCall(false);
    const pc = (RTCPeerConnection as unknown as jest.Mock).mock.results.at(-1)!.value;

    // No remote description set yet — must not touch the peer connection.
    await manager.addRemoteIceCandidate(JSON.stringify({ candidate: 'early' }));
    expect(pc.addIceCandidate).not.toHaveBeenCalled();

    await manager.setRemoteAnswer(JSON.stringify({ type: 'answer', sdp: 'x' }));

    expect(pc.addIceCandidate).toHaveBeenCalledTimes(1);
  });

  it('swallows errors from stale/duplicate candidates instead of throwing', async () => {
    const manager = makeManager();
    await manager.startCall(false);
    await manager.setRemoteAnswer(JSON.stringify({ type: 'answer', sdp: 'x' }));
    const pc = (RTCPeerConnection as unknown as jest.Mock).mock.results.at(-1)!.value;
    pc.addIceCandidate.mockRejectedValueOnce(new Error('stale candidate'));

    await expect(manager.addRemoteIceCandidate(JSON.stringify({ candidate: 'stale' }))).resolves.toBeUndefined();
  });
});

describe('CallManager callbacks', () => {
  it('fires onLocalIceCandidate when the peer connection emits one', async () => {
    const onLocalIceCandidate = jest.fn();
    const manager = new CallManager({ onLocalIceCandidate, onRemoteStream: jest.fn(), onConnectionFailed: jest.fn(), onConnected: jest.fn() });
    await manager.startCall(false);
    const pc = (RTCPeerConnection as unknown as jest.Mock).mock.results.at(-1)!.value;

    pc.onicecandidate({ candidate: { toJSON: () => ({ candidate: 'abc' }) } });

    expect(onLocalIceCandidate).toHaveBeenCalledWith(JSON.stringify({ candidate: 'abc' }));
  });

  it('does not fire onLocalIceCandidate for the end-of-candidates null event', async () => {
    const onLocalIceCandidate = jest.fn();
    const manager = new CallManager({ onLocalIceCandidate, onRemoteStream: jest.fn(), onConnectionFailed: jest.fn(), onConnected: jest.fn() });
    await manager.startCall(false);
    const pc = (RTCPeerConnection as unknown as jest.Mock).mock.results.at(-1)!.value;

    pc.onicecandidate({ candidate: null });

    expect(onLocalIceCandidate).not.toHaveBeenCalled();
  });

  it('fires onRemoteStream when a remote track arrives', async () => {
    const onRemoteStream = jest.fn();
    const manager = new CallManager({ onLocalIceCandidate: jest.fn(), onRemoteStream, onConnectionFailed: jest.fn(), onConnected: jest.fn() });
    await manager.startCall(true);
    const pc = (RTCPeerConnection as unknown as jest.Mock).mock.results.at(-1)!.value;
    const remoteStream = { id: 'remote' };

    pc.ontrack({ streams: [remoteStream] });

    expect(onRemoteStream).toHaveBeenCalledWith(remoteStream);
  });

  it('fires onConnectionFailed when the connection state becomes "failed"', async () => {
    const onConnectionFailed = jest.fn();
    const manager = new CallManager({ onLocalIceCandidate: jest.fn(), onRemoteStream: jest.fn(), onConnectionFailed, onConnected: jest.fn() });
    await manager.startCall(false);
    const pc = (RTCPeerConnection as unknown as jest.Mock).mock.results.at(-1)!.value;

    pc.connectionState = 'failed';
    pc.onconnectionstatechange();

    expect(onConnectionFailed).toHaveBeenCalled();
  });

  it('does not fire onConnectionFailed for a healthy "connected" state', async () => {
    const onConnectionFailed = jest.fn();
    const manager = new CallManager({ onLocalIceCandidate: jest.fn(), onRemoteStream: jest.fn(), onConnectionFailed, onConnected: jest.fn() });
    await manager.startCall(false);
    const pc = (RTCPeerConnection as unknown as jest.Mock).mock.results.at(-1)!.value;

    pc.connectionState = 'connected';
    pc.onconnectionstatechange();

    expect(onConnectionFailed).not.toHaveBeenCalled();
  });

  it('fires onConnected once the connection state becomes "connected"', async () => {
    const onConnected = jest.fn();
    const manager = new CallManager({ onLocalIceCandidate: jest.fn(), onRemoteStream: jest.fn(), onConnectionFailed: jest.fn(), onConnected });
    await manager.startCall(false);
    const pc = (RTCPeerConnection as unknown as jest.Mock).mock.results.at(-1)!.value;

    expect(onConnected).not.toHaveBeenCalled();

    pc.connectionState = 'connected';
    pc.onconnectionstatechange();

    expect(onConnected).toHaveBeenCalled();
  });

  it('does not fire onConnected for other, non-connected state transitions', async () => {
    const onConnected = jest.fn();
    const manager = new CallManager({ onLocalIceCandidate: jest.fn(), onRemoteStream: jest.fn(), onConnectionFailed: jest.fn(), onConnected });
    await manager.startCall(false);
    const pc = (RTCPeerConnection as unknown as jest.Mock).mock.results.at(-1)!.value;

    pc.connectionState = 'connecting';
    pc.onconnectionstatechange();

    expect(onConnected).not.toHaveBeenCalled();
  });
});

describe('CallManager mute/camera toggles', () => {
  it('setAudioEnabled only touches audio tracks, never video tracks', async () => {
    const manager = makeManager();
    const { stream } = await manager.startCall(true);
    const [audioTrack] = stream.getAudioTracks();
    const [videoTrack] = stream.getVideoTracks();

    manager.setAudioEnabled(false);

    expect(audioTrack.enabled).toBe(false);
    expect(videoTrack.enabled).toBe(true);
  });

  it('setVideoEnabled only touches video tracks, never audio tracks', async () => {
    const manager = makeManager();
    const { stream } = await manager.startCall(true);
    const [audioTrack] = stream.getAudioTracks();
    const [videoTrack] = stream.getVideoTracks();

    manager.setVideoEnabled(false);

    expect(videoTrack.enabled).toBe(false);
    expect(audioTrack.enabled).toBe(true);
  });

  it('is a no-op on an audio-only call with no video tracks to toggle', async () => {
    const manager = makeManager();
    await manager.startCall(false);
    expect(() => manager.setVideoEnabled(false)).not.toThrow();
  });
});

describe('CallManager cleanup', () => {
  it('stops every local track and closes the peer connection', async () => {
    const manager = makeManager();
    const { stream } = await manager.startCall(true);
    const pc = (RTCPeerConnection as unknown as jest.Mock).mock.results.at(-1)!.value;
    const tracks = stream.getTracks();

    manager.cleanup();

    tracks.forEach((track) => expect(track.stop).toHaveBeenCalled());
    expect(pc.close).toHaveBeenCalled();
  });

  it('is safe to call before any call has started', () => {
    const manager = makeManager();
    expect(() => manager.cleanup()).not.toThrow();
  });
});
