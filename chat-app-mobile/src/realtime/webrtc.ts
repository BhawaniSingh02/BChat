import {
  MediaStream,
  mediaDevices,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from 'react-native-webrtc';
import { getIceServers } from './iceServers';

/**
 * Diagnostic only — extracts the audio m-section from an SDP blob and logs its
 * negotiated direction (sendrecv/sendonly/recvonly/inactive) and codec line, so a
 * real call test tells us definitively whether audio is actually negotiated to
 * flow both ways, instead of inferring it from method-call timing alone.
 */
function logAudioSdp(label: string, sdp: string): void {
  const audioSection = sdp.split(/\r?\nm=/).find((s) => s.startsWith('audio') || s.startsWith('m=audio'));
  if (!audioSection) {
    console.log(`[SDP-DEBUG] ${label}: no audio m-section found`);
    return;
  }
  const lines = audioSection.split(/\r?\n/);
  const direction = lines.find((l) => /^a=(sendrecv|sendonly|recvonly|inactive)/.test(l)) ?? '(no direction attribute)';
  const rtpmap = lines.filter((l) => l.startsWith('a=rtpmap')).join(' | ');
  console.log(`[SDP-DEBUG] ${label}: direction=${direction} codecs=${rtpmap}`);
}

export interface CallManagerCallbacks {
  onLocalIceCandidate: (candidateJson: string) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionFailed: () => void;
  onConnected: () => void;
}

/**
 * Wraps react-native-webrtc's RTCPeerConnection lifecycle for one call, mirroring
 * chat-app-frontend's useWebRTC.ts (offer/answer/ICE-candidate flow) minus the
 * browser-only bits (codec-preference workarounds, ICE-restart-on-disconnect —
 * the latter deliberately deferred, see planning/MOBILE_PLAN.md).
 */
export class CallManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private pendingRemoteCandidates: Array<Record<string, unknown>> = [];
  private callbacks: CallManagerCallbacks;

  constructor(callbacks: CallManagerCallbacks) {
    this.callbacks = callbacks;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  private async createPeerConnection(): Promise<RTCPeerConnection> {
    const iceServers = await getIceServers();
    const pc = new RTCPeerConnection({ iceServers });

    // The library's .d.ts for its EventTarget base class isn't fully published in this
    // version's lib output, so `addEventListener` doesn't type-check even though it works
    // at runtime — the `on<event>` setter properties are explicitly declared, so use those.
    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        this.callbacks.onLocalIceCandidate(JSON.stringify(event.candidate.toJSON()));
      }
    };
    pc.ontrack = (event: any) => {
      const track = event.track;
      if (track) {
        console.log(
          `[SDP-DEBUG] ontrack: kind=${track.kind} id=${track.id} enabled=${track.enabled} muted=${track.muted} readyState=${track.readyState}`,
        );
      }
      const stream = event.streams?.[0];
      if (stream) this.callbacks.onRemoteStream(stream);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.callbacks.onConnectionFailed();
      } else if (pc.connectionState === 'connected') {
        this.callbacks.onConnected();
        // Diagnostic: 3s after connecting, check whether audio RTP packets are
        // actually arriving — this is the ground truth, more reliable than
        // inferring from ontrack/SDP alone (a receiver can exist with zero packets).
        setTimeout(() => this.logAudioStats(pc), 3000);
      }
    };

    this.pc = pc;
    return pc;
  }

  private async logAudioStats(pc: RTCPeerConnection): Promise<void> {
    if (this.pc !== pc) return; // call ended/superseded before the 3s delay elapsed
    try {
      const stats = await pc.getStats();
      stats.forEach((report: any) => {
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          console.log(
            `[SDP-DEBUG] inbound audio stats: packetsReceived=${report.packetsReceived} bytesReceived=${report.bytesReceived} audioLevel=${report.audioLevel} jitter=${report.jitter}`,
          );
        }
        if (report.type === 'outbound-rtp' && report.kind === 'audio') {
          console.log(
            `[SDP-DEBUG] outbound audio stats: packetsSent=${report.packetsSent} bytesSent=${report.bytesSent}`,
          );
        }
      });
    } catch (err: any) {
      console.log(`[SDP-DEBUG] getStats failed: ${err?.message}`);
    }
  }

  private async acquireLocalMedia(isVideo: boolean): Promise<MediaStream> {
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: isVideo ? { facingMode: 'user' } : false,
    });
    this.localStream = stream;
    return stream;
  }

  async startCall(isVideo: boolean): Promise<{ stream: MediaStream; sdpOffer: string }> {
    const stream = await this.acquireLocalMedia(isVideo);
    const pc = await this.createPeerConnection();
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    const offer = await pc.createOffer({});
    logAudioSdp('local offer (startCall)', offer.sdp ?? '');
    await pc.setLocalDescription(offer);
    return { stream, sdpOffer: JSON.stringify(offer) };
  }

  async answerCall(sdpOfferJson: string, isVideo: boolean): Promise<{ stream: MediaStream; sdpAnswer: string }> {
    const stream = await this.acquireLocalMedia(isVideo);
    const pc = await this.createPeerConnection();
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    const parsedOffer = JSON.parse(sdpOfferJson);
    logAudioSdp('remote offer (answerCall, incoming)', parsedOffer.sdp ?? '');
    await pc.setRemoteDescription(new RTCSessionDescription(parsedOffer));
    await this.flushPendingCandidates();
    const answer = await pc.createAnswer();
    logAudioSdp('local answer (answerCall)', answer.sdp ?? '');
    await pc.setLocalDescription(answer);
    return { stream, sdpAnswer: JSON.stringify(answer) };
  }

  async setRemoteAnswer(sdpAnswerJson: string): Promise<void> {
    if (!this.pc) return;
    const parsedAnswer = JSON.parse(sdpAnswerJson);
    logAudioSdp('remote answer (setRemoteAnswer, incoming)', parsedAnswer.sdp ?? '');
    await this.pc.setRemoteDescription(new RTCSessionDescription(parsedAnswer));
    await this.flushPendingCandidates();
  }

  async addRemoteIceCandidate(candidateJson: string): Promise<void> {
    const candidate = JSON.parse(candidateJson);
    if (!this.pc || !this.pc.remoteDescription) {
      this.pendingRemoteCandidates.push(candidate);
      return;
    }
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate as any));
    } catch {
      // Stale/duplicate candidates are expected during normal negotiation — not fatal.
    }
  }

  private async flushPendingCandidates(): Promise<void> {
    if (!this.pc) return;
    const pending = this.pendingRemoteCandidates;
    this.pendingRemoteCandidates = [];
    for (const candidate of pending) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate as any));
      } catch {
        // ignore — see addRemoteIceCandidate
      }
    }
  }

  setAudioEnabled(enabled: boolean): void {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  setVideoEnabled(enabled: boolean): void {
    this.localStream?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  /** Flips between the front and back camera mid-call. `_switchCamera` is react-native-webrtc's
   * non-standard extension on the video track — there's no equivalent web MediaStreamTrack API. */
  switchCamera(): void {
    this.localStream?.getVideoTracks().forEach((track) => {
      (track as unknown as { _switchCamera?: () => void })._switchCamera?.();
    });
  }

  cleanup(): void {
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.pc?.close();
    this.pc = null;
    this.pendingRemoteCandidates = [];
  }
}
