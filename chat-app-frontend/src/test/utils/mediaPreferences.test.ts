import { describe, it, expect, beforeEach } from 'vitest'
import {
  getPreferredMicId, getPreferredCameraId, getPreferredSpeakerId,
  setPreferredMicId, setPreferredCameraId, setPreferredSpeakerId,
  buildAudioConstraints, buildVideoConstraints, applyPreferredSpeaker,
} from '../../utils/mediaPreferences'

describe('mediaPreferences', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips device preferences through localStorage', () => {
    setPreferredMicId('mic-1')
    setPreferredCameraId('cam-1')
    setPreferredSpeakerId('spk-1')
    expect(getPreferredMicId()).toBe('mic-1')
    expect(getPreferredCameraId()).toBe('cam-1')
    expect(getPreferredSpeakerId()).toBe('spk-1')
  })

  it('clears a preference when set to empty', () => {
    setPreferredMicId('mic-1')
    setPreferredMicId('')
    expect(getPreferredMicId()).toBe('')
  })

  it('builds base audio constraints when no microphone is chosen', () => {
    const c = buildAudioConstraints()
    expect(c).toMatchObject({ echoCancellation: true, noiseSuppression: true, autoGainControl: true })
    expect('deviceId' in c).toBe(false)
  })

  it('includes the preferred microphone as an ideal deviceId', () => {
    setPreferredMicId('mic-1')
    const c = buildAudioConstraints()
    expect(c.deviceId).toEqual({ ideal: 'mic-1' })
  })

  it('returns false video constraints for an audio-only call', () => {
    setPreferredCameraId('cam-1')
    expect(buildVideoConstraints(false)).toBe(false)
  })

  it('returns 16:9 shape constraints when no camera is chosen', () => {
    expect(buildVideoConstraints(true)).toEqual({
      aspectRatio: { ideal: 16 / 9 },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    })
  })

  it('includes the preferred camera as an ideal deviceId alongside the 16:9 shape', () => {
    setPreferredCameraId('cam-1')
    expect(buildVideoConstraints(true)).toEqual({
      aspectRatio: { ideal: 16 / 9 },
      width: { ideal: 1280 },
      height: { ideal: 720 },
      deviceId: { ideal: 'cam-1' },
    })
  })

  it('applyPreferredSpeaker is a no-op when element is null', async () => {
    setPreferredSpeakerId('spk-1')
    await expect(applyPreferredSpeaker(null)).resolves.toBeUndefined()
  })

  it('applyPreferredSpeaker calls setSinkId with the chosen speaker', async () => {
    setPreferredSpeakerId('spk-1')
    const calls: string[] = []
    const el = { setSinkId: async (id: string) => { calls.push(id) } } as unknown as HTMLMediaElement
    await applyPreferredSpeaker(el)
    expect(calls).toEqual(['spk-1'])
  })
})
