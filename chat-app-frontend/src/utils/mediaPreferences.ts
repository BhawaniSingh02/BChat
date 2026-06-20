/**
 * Persisted audio/video device preferences for calls. The user picks their
 * preferred microphone, camera and speaker in Settings → Video & voice; these
 * helpers store the choices and translate them into getUserMedia constraints /
 * an audio output sinkId. Uses `ideal` (not `exact`) so a call never fails just
 * because a remembered device was unplugged — it falls back to the default.
 */

const MIC_KEY = 'baaat.device.mic'
const CAM_KEY = 'baaat.device.camera'
const SPEAKER_KEY = 'baaat.device.speaker'

function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function write(key: string, value: string): void {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    /* storage unavailable — preferences just won't persist */
  }
}

export function getPreferredMicId(): string {
  return read(MIC_KEY)
}
export function getPreferredCameraId(): string {
  return read(CAM_KEY)
}
export function getPreferredSpeakerId(): string {
  return read(SPEAKER_KEY)
}

export function setPreferredMicId(id: string): void {
  write(MIC_KEY, id)
}
export function setPreferredCameraId(id: string): void {
  write(CAM_KEY, id)
}
export function setPreferredSpeakerId(id: string): void {
  write(SPEAKER_KEY, id)
}

/** Audio constraints for getUserMedia, honouring the preferred microphone. */
export function buildAudioConstraints(): MediaTrackConstraints {
  const base: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  }
  const micId = getPreferredMicId()
  return micId ? { ...base, deviceId: { ideal: micId } } : base
}

/** Video constraints for getUserMedia, honouring the preferred camera. */
export function buildVideoConstraints(withVideo: boolean): boolean | MediaTrackConstraints {
  if (!withVideo) return false
  const camId = getPreferredCameraId()
  return camId ? { deviceId: { ideal: camId } } : true
}

/**
 * Route an audio element's output to the preferred speaker (best-effort).
 * `setSinkId` is non-standard and only available in some browsers, so this is a
 * no-op when unsupported or when no speaker preference is set.
 */
export async function applyPreferredSpeaker(el: HTMLMediaElement | null): Promise<void> {
  const speakerId = getPreferredSpeakerId()
  if (!el || !speakerId) return
  const sinkable = el as HTMLMediaElement & { setSinkId?: (id: string) => Promise<void> }
  if (typeof sinkable.setSinkId !== 'function') return
  try {
    await sinkable.setSinkId(speakerId)
  } catch {
    /* device gone or not permitted — keep default output */
  }
}
