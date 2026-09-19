import { Audio } from 'expo-av';

let sound: Audio.Sound | null = null;

export async function startRingtone(): Promise<void> {
  if (sound) return;
  try {
    const { sound: loaded } = await Audio.Sound.createAsync(require('../../assets/sounds/ringtone.wav'), {
      isLooping: true,
      volume: 1.0,
    });
    sound = loaded;
    await sound.playAsync();
  } catch {
    // Non-fatal — a silent incoming call is still answerable, just without audio.
  }
}

export async function stopRingtone(): Promise<void> {
  if (!sound) return;
  const toUnload = sound;
  sound = null;
  try {
    await toUnload.stopAsync();
    await toUnload.unloadAsync();
  } catch {
    // already stopped/unloaded
  }
}
