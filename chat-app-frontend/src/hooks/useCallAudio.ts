/**
 * useCallAudio — Web Audio API tones for call lifecycle events.
 *
 * No external audio files needed. All tones are synthesized using
 * the OscillatorNode API available in all modern browsers.
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

/** Play a short tone burst (attack + sustain + release). */
function playTone(
  frequency: number,
  duration: number,
  gainValue = 0.3,
  type: OscillatorType = 'sine',
  startDelay = 0,
): void {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + startDelay)

    const start = ctx.currentTime + startDelay
    gainNode.gain.setValueAtTime(0, start)
    gainNode.gain.linearRampToValueAtTime(gainValue, start + 0.02)
    gainNode.gain.setValueAtTime(gainValue, start + duration - 0.05)
    gainNode.gain.linearRampToValueAtTime(0, start + duration)

    oscillator.start(start)
    oscillator.stop(start + duration)
  } catch {
    // Audio may not be available (e.g. jsdom in tests) — ignore silently
  }
}

/** Cleanup function returned by startRingtone / startDialTone. */
export type StopFn = () => void

/**
 * Start a repeating incoming-call ringtone (US double-ring pattern).
 * Returns a stop function to call when the ring should end.
 */
export function startRingtone(): StopFn {
  let active = true

  const ring = () => {
    if (!active) return
    // Two short rings separated by silence: 440+480Hz (US telephone ring)
    playTone(440, 0.4, 0.25, 'sine', 0)
    playTone(480, 0.4, 0.20, 'sine', 0)
    playTone(440, 0.4, 0.25, 'sine', 0.5)
    playTone(480, 0.4, 0.20, 'sine', 0.5)
    // Repeat every 3 seconds
    if (active) {
      setTimeout(() => { if (active) ring() }, 3000)
    }
  }

  ring()
  return () => { active = false }
}

/**
 * Start a repeating outgoing-call dial tone (425Hz, EU ringback).
 * Returns a stop function.
 */
export function startDialTone(): StopFn {
  let active = true

  const dial = () => {
    if (!active) return
    playTone(425, 0.6, 0.15, 'sine')
    if (active) {
      setTimeout(() => { if (active) dial() }, 2000)
    }
  }

  dial()
  return () => { active = false }
}

/** Play a short "call connected" chime. */
export function playConnectedChime(): void {
  playTone(880, 0.12, 0.2, 'sine', 0)
  playTone(1100, 0.15, 0.2, 'sine', 0.1)
  playTone(1320, 0.20, 0.2, 'sine', 0.2)
}

/** Play a short "hang up" descending tone. */
export function playHangUpTone(): void {
  playTone(600, 0.15, 0.2, 'sine', 0)
  playTone(400, 0.15, 0.2, 'sine', 0.15)
  playTone(250, 0.20, 0.2, 'sine', 0.3)
}
