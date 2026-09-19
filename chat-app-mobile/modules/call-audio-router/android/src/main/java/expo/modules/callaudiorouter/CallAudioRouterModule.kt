package expo.modules.callaudiorouter

import android.content.Context
import android.media.AudioManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Minimal, purpose-built replacement for react-native-incall-manager (which turned out
 * to rely on the legacy NativeModules bridge and never linked under this app's New
 * Architecture setup). Does exactly what a WebRTC call needs from the Android audio
 * session: MODE_IN_COMMUNICATION so the native WebRTC audio engine applies proper echo
 * cancellation, explicit speakerphone routing instead of the earpiece default, and an
 * explicit STREAM_VOICE_CALL volume — a separate volume level from media/ringtone that
 * the hardware volume buttons only control *while already in a call*, so it can sit at
 * whatever it was last left at (often low or zero on a phone that's never taken a real
 * cellular call) with no obvious way for the user to have raised it beforehand.
 */
class CallAudioRouterModule : Module() {
  private val audioManager: AudioManager?
    get() = appContext.reactContext?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

  override fun definition() = ModuleDefinition {
    Name("CallAudioRouter")

    Function("startCallAudio") {
      audioManager?.let { am ->
        am.mode = AudioManager.MODE_IN_COMMUNICATION
        @Suppress("DEPRECATION")
        am.isSpeakerphoneOn = true
        val maxVolume = am.getStreamMaxVolume(AudioManager.STREAM_VOICE_CALL)
        am.setStreamVolume(AudioManager.STREAM_VOICE_CALL, maxVolume, 0)
      }
    }

    Function("stopCallAudio") {
      audioManager?.let { am ->
        @Suppress("DEPRECATION")
        am.isSpeakerphoneOn = false
        am.mode = AudioManager.MODE_NORMAL
      }
    }

    Function("setSpeakerphoneOn") { enabled: Boolean ->
      @Suppress("DEPRECATION")
      audioManager?.isSpeakerphoneOn = enabled
    }
  }
}
