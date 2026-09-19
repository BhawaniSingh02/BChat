import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Image, Text, TouchableOpacity } from 'react-native';
import MessageBubbleContent from './MessageBubbleContent';
import { Message } from '../types';
import { lightTheme } from '../theme/tokens';

// MessageBubbleContent also defines the AUDIO player (unused by these IMAGE/FILE tests), which
// imports expo-av at module scope — jest-expo's auto-mock doesn't cover its native module, so
// stub it directly rather than pulling in the real native binding.
jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn().mockResolvedValue({ sound: { unloadAsync: jest.fn() } }),
    },
  },
}));

function baseMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    roomId: 'general',
    sender: 'alice',
    senderName: 'Alice',
    content: '',
    messageType: 'TEXT',
    readBy: [],
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function findTextByContent(renderer: ReactTestRenderer, content: string) {
  return renderer.root.findAll((node) => node.type === Text && node.props.children === content)[0];
}

/** Renders and flushes the Feather icon set's async font-loading state update, so it lands
 * inside act() instead of warning after the test body has already made its assertions. */
async function renderBubble(props: React.ComponentProps<typeof MessageBubbleContent>): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<MessageBubbleContent {...props} />);
    await Promise.resolve();
  });
  return renderer;
}

describe('MessageBubbleContent (mobile)', () => {
  describe('IMAGE messages', () => {
    it('renders the image at the fixed 4:3 frame size and forwards taps to onPressImage', async () => {
      const onPressImage = jest.fn();
      const msg = baseMessage({ messageType: 'IMAGE', fileUrl: 'https://res.cloudinary.com/demo/image/upload/photo.jpg' });

      const renderer = await renderBubble({ item: msg, mine: false, tokens: lightTheme, onPressImage, onPressFile: jest.fn() });

      const image = renderer.root.findByType(Image);
      expect(image.props.source).toEqual({ uri: msg.fileUrl });
      expect(image.props.style).toMatchObject({ width: 240, height: 180 });

      const touchable = renderer.root.findByType(TouchableOpacity);
      act(() => {
        touchable.props.onPress();
      });
      expect(onPressImage).toHaveBeenCalledWith(msg.fileUrl);
    });
  });

  describe('FILE messages (file card)', () => {
    it('shows the PDF badge and forwards taps to onPressFile for a known file type', async () => {
      const onPressFile = jest.fn();
      const msg = baseMessage({ messageType: 'FILE', fileUrl: 'https://res.cloudinary.com/demo/raw/upload/report.pdf' });

      const renderer = await renderBubble({ item: msg, mine: false, tokens: lightTheme, onPressImage: jest.fn(), onPressFile });

      expect(findTextByContent(renderer, 'report.pdf')).toBeDefined();
      expect(findTextByContent(renderer, 'PDF')).toBeDefined();

      const touchable = renderer.root.findByType(TouchableOpacity);
      act(() => {
        touchable.props.onPress();
      });
      expect(onPressFile).toHaveBeenCalledWith(msg);
    });

    it('falls back to the generic FILE badge for an unrecognized extension', async () => {
      const msg = baseMessage({ messageType: 'FILE', fileUrl: 'https://res.cloudinary.com/demo/raw/upload/archive.zip' });

      const renderer = await renderBubble({ item: msg, mine: false, tokens: lightTheme, onPressImage: jest.fn(), onPressFile: jest.fn() });

      expect(findTextByContent(renderer, 'archive.zip')).toBeDefined();
      expect(findTextByContent(renderer, 'FILE')).toBeDefined();
      expect(findTextByContent(renderer, 'ZIP')).toBeUndefined();
    });

    it('falls back to the generic FILE badge (not a crash) for a filename with no extension', async () => {
      const msg = baseMessage({ messageType: 'FILE', fileUrl: 'https://res.cloudinary.com/demo/raw/upload/README' });

      const renderer = await renderBubble({ item: msg, mine: false, tokens: lightTheme, onPressImage: jest.fn(), onPressFile: jest.fn() });

      expect(findTextByContent(renderer, 'README')).toBeDefined();
      expect(findTextByContent(renderer, 'FILE')).toBeDefined();
    });

    it('falls back to "file" instead of a blank name for a URL with no filename segment', async () => {
      const msg = baseMessage({ messageType: 'FILE', fileUrl: 'https://res.cloudinary.com/demo/raw/upload/' });

      const renderer = await renderBubble({ item: msg, mine: false, tokens: lightTheme, onPressImage: jest.fn(), onPressFile: jest.fn() });

      expect(findTextByContent(renderer, 'file')).toBeDefined();
    });
  });
});
