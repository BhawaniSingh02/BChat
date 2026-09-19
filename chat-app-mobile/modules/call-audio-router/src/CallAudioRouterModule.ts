import { NativeModule, requireNativeModule } from 'expo';

declare class CallAudioRouterModule extends NativeModule {
  /** Puts the audio session into call mode (MODE_IN_COMMUNICATION) and forces the speaker on. */
  startCallAudio(): void;
  /** Reverts the audio session to normal playback mode and turns the speaker off. */
  stopCallAudio(): void;
  setSpeakerphoneOn(enabled: boolean): void;
}

// This call loads the native module object via JSI — unlike the legacy NativeModules
// bridge, this is the path Expo's New Architecture setup actually supports.
export default requireNativeModule<CallAudioRouterModule>('CallAudioRouter');
