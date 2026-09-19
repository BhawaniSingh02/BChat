// Manual mock for the native react-native-webrtc module — there's no real WebRTC
// engine available under Jest/Node, so this stands in a minimal, spy-able fake that
// mirrors the bits CallManager (src/realtime/webrtc.ts) actually calls. Placed at the
// project root's __mocks__/ so Jest substitutes it automatically for every test,
// without each test file needing its own jest.mock('react-native-webrtc') call.

class MockMediaStreamTrack {
  constructor(kind) {
    this.kind = kind;
    this.enabled = true;
    this.stop = jest.fn();
  }
}

class MediaStream {
  constructor(tracks = []) {
    this._tracks = tracks;
  }
  getTracks() {
    return this._tracks;
  }
  getAudioTracks() {
    return this._tracks.filter((t) => t.kind === 'audio');
  }
  getVideoTracks() {
    return this._tracks.filter((t) => t.kind === 'video');
  }
}

const mediaDevices = {
  getUserMedia: jest.fn((constraints) => {
    const tracks = [];
    if (constraints?.audio) tracks.push(new MockMediaStreamTrack('audio'));
    if (constraints?.video) tracks.push(new MockMediaStreamTrack('video'));
    return Promise.resolve(new MediaStream(tracks));
  }),
};

class RTCPeerConnectionImpl {
  constructor(config) {
    this.config = config;
    this.connectionState = 'new';
    this.localDescription = null;
    this.remoteDescription = null;
    this.onicecandidate = null;
    this.ontrack = null;
    this.onconnectionstatechange = null;
    this._tracks = [];
    this.addTrack = jest.fn((track, stream) => {
      this._tracks.push({ track, stream });
    });
    this.close = jest.fn();
    this.addIceCandidate = jest.fn(() => Promise.resolve());
  }
  createOffer() {
    return Promise.resolve({ type: 'offer', sdp: 'mock-offer-sdp' });
  }
  createAnswer() {
    return Promise.resolve({ type: 'answer', sdp: 'mock-answer-sdp' });
  }
  setLocalDescription(desc) {
    this.localDescription = desc;
    return Promise.resolve();
  }
  setRemoteDescription(desc) {
    this.remoteDescription = desc;
    return Promise.resolve();
  }
}

// Wrapped in jest.fn so tests can inspect `.mock.results` to reach the instance a
// given `new RTCPeerConnection(...)` call produced — a plain class wouldn't be spyable.
const RTCPeerConnection = jest.fn(function (config) {
  return new RTCPeerConnectionImpl(config);
});

class RTCIceCandidate {
  constructor(init) {
    Object.assign(this, init);
  }
}

class RTCSessionDescription {
  constructor(init) {
    Object.assign(this, init);
  }
}

function RTCView() {
  return null;
}

module.exports = {
  MediaStream,
  MockMediaStreamTrack,
  mediaDevices,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
};
