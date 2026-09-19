import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
import VoiceRecorder from './VoiceRecorder';
import { uploadApi } from '../api/upload';
import { lightTheme } from '../theme/tokens';

jest.mock('../api/upload', () => ({
  uploadApi: { uploadFile: jest.fn() },
}));

const mockStopAndUnloadAsync = jest.fn().mockResolvedValue(undefined);
const mockGetURI = jest.fn(() => 'file:///tmp/voice-test.m4a');
let statusCallback: ((status: { durationMillis: number; metering?: number }) => void) | null = null;

jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    RecordingOptionsPresets: { HIGH_QUALITY: {} },
    Recording: {
      createAsync: jest.fn((_options: unknown, onStatus: (status: unknown) => void) => {
        statusCallback = onStatus as typeof statusCallback;
        return Promise.resolve({
          recording: {
            stopAndUnloadAsync: mockStopAndUnloadAsync,
            getURI: mockGetURI,
          },
        });
      }),
    },
  },
}));

async function flush(ticks = 5) {
  await act(async () => {
    for (let i = 0; i < ticks; i++) {
      await Promise.resolve();
    }
  });
}

function findButtonByTestId(renderer: ReactTestRenderer, testID: string) {
  return renderer.root.findAllByType(TouchableOpacity).find((n) => n.props.testID === testID);
}

function hasTestId(renderer: ReactTestRenderer, testID: string) {
  return renderer.root.findAll((node) => node.props?.testID === testID).length > 0;
}

describe('VoiceRecorder (mobile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    statusCallback = null;
    mockGetURI.mockReturnValue('file:///tmp/voice-test.m4a');
    mockStopAndUnloadAsync.mockResolvedValue(undefined);
  });

  it('shows a retry option after a failed upload and resends the same recording on retry', async () => {
    const onSend = jest.fn();
    const uploadFile = uploadApi.uploadFile as jest.Mock;
    uploadFile
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ url: 'https://res.cloudinary.com/demo/voice.mp3', messageType: 'AUDIO', bytes: 100 });

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<VoiceRecorder tokens={lightTheme} onSend={onSend} onCancel={jest.fn()} />);
    });
    await flush(); // let permission + Recording.createAsync resolve

    // Simulate a couple of recording status ticks so elapsed/metering advance
    await act(async () => {
      statusCallback?.({ durationMillis: 1000, metering: -20 });
      statusCallback?.({ durationMillis: 2000, metering: -10 });
    });

    const sendBtn = findButtonByTestId(renderer, 'voice-send-btn');
    expect(sendBtn).toBeDefined();

    await act(async () => {
      await sendBtn!.props.onPress();
    });
    await flush();

    // First upload attempt fails — error shown, retry button appears, onSend not called
    expect(hasTestId(renderer, 'voice-error')).toBe(true);
    const retryBtn = findButtonByTestId(renderer, 'voice-retry-btn');
    expect(retryBtn).toBeDefined();
    expect(onSend).not.toHaveBeenCalled();
    expect(uploadFile).toHaveBeenCalledTimes(1);

    await act(async () => {
      retryBtn!.props.onPress();
    });
    await flush();

    // Retry re-uploads the same recorded file (same local uri) and succeeds
    expect(uploadFile).toHaveBeenCalledTimes(2);
    expect(uploadFile.mock.calls[0][0].uri).toBe('file:///tmp/voice-test.m4a');
    expect(uploadFile.mock.calls[1][0].uri).toBe('file:///tmp/voice-test.m4a');
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith('https://res.cloudinary.com/demo/voice.mp3', expect.any(Number), expect.any(Array));
  }, 15000); // generous timeout — a cold Jest transform cache (e.g. right after a fresh install) can push this past the 5s default

  it('does not show a retry option before any send has been attempted', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<VoiceRecorder tokens={lightTheme} onSend={jest.fn()} onCancel={jest.fn()} />);
    });
    await flush();

    expect(findButtonByTestId(renderer, 'voice-retry-btn')).toBeUndefined();
    expect(findButtonByTestId(renderer, 'voice-send-btn')).toBeDefined();
  });
});
