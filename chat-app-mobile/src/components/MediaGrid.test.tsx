import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Animated, Text, TouchableOpacity } from 'react-native';
import MediaGrid from './MediaGrid';
import { Message } from '../types';
import { lightTheme } from '../theme/tokens';

function makeImage(id: string, overrides: Partial<Message> = {}): Message {
  return {
    id,
    roomId: 'general',
    sender: 'alice',
    senderName: 'Alice',
    content: `photo${id}.jpg`,
    messageType: 'IMAGE',
    fileUrl: `https://res.cloudinary.com/demo/image/upload/photo${id}.jpg`,
    readBy: [],
    timestamp: '2026-03-28T10:00:00Z',
    ...overrides,
  };
}

function findAllByTestId(renderer: ReactTestRenderer, testID: string) {
  return renderer.root.findAllByType(TouchableOpacity).filter((n) => n.props.testID === testID);
}

function findTextByContent(renderer: ReactTestRenderer, content: string) {
  return renderer.root.findAll((node) => {
    if (node.type !== Text) return false;
    const children = node.props.children;
    const joined = Array.isArray(children) ? children.join('') : children;
    return joined === content;
  })[0];
}

/** Renders and flushes the Feather icon set's async font-loading state update, so it lands
 * inside act() instead of leaking into a later, torn-down test context. */
async function renderGrid(props: React.ComponentProps<typeof MediaGrid>): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<MediaGrid {...props} />);
    await Promise.resolve();
  });
  return renderer;
}

describe('MediaGrid (mobile)', () => {
  it('renders one tile per image when there are 4 or fewer', async () => {
    const messages = [makeImage('1'), makeImage('2'), makeImage('3')];
    const renderer = await renderGrid({ messages, mine: true, tokens: lightTheme, onOpenViewer: jest.fn(), onLongPressTile: jest.fn() });
    expect(findAllByTestId(renderer, 'media-grid-tile')).toHaveLength(3);
    expect(findAllByTestId(renderer, 'media-grid-overflow')).toHaveLength(0);
  });

  it('caps at 4 visible tiles and shows a "+N" overflow badge on the last one', async () => {
    const messages = [makeImage('1'), makeImage('2'), makeImage('3'), makeImage('4'), makeImage('5'), makeImage('6')];
    const renderer = await renderGrid({ messages, mine: true, tokens: lightTheme, onOpenViewer: jest.fn(), onLongPressTile: jest.fn() });
    expect(findAllByTestId(renderer, 'media-grid-tile')).toHaveLength(4);
    expect(findTextByContent(renderer, '+2')).toBeDefined();
  });

  it('opens the viewer with the whole run and the tapped index, including overflowed images', async () => {
    const onOpenViewer = jest.fn();
    const messages = [makeImage('1'), makeImage('2'), makeImage('3'), makeImage('4'), makeImage('5')];
    const renderer = await renderGrid({ messages, mine: true, tokens: lightTheme, onOpenViewer, onLongPressTile: jest.fn() });
    const tiles = findAllByTestId(renderer, 'media-grid-tile');
    act(() => {
      tiles[2].props.onPress();
    });
    expect(onOpenViewer).toHaveBeenCalledWith(messages.map((m) => m.fileUrl), 2);
  });

  it('long-pressing a tile calls onLongPressTile with that single message, not a group action', async () => {
    const onLongPressTile = jest.fn();
    const messages = [makeImage('1'), makeImage('2')];
    const renderer = await renderGrid({ messages, mine: true, tokens: lightTheme, onOpenViewer: jest.fn(), onLongPressTile });
    const tiles = findAllByTestId(renderer, 'media-grid-tile');
    act(() => {
      tiles[1].props.onLongPress();
    });
    expect(onLongPressTile).toHaveBeenCalledWith(messages[1]);
  });

  it('does not open the viewer or action sheet while in selection mode', async () => {
    const onOpenViewer = jest.fn();
    const onLongPressTile = jest.fn();
    const messages = [makeImage('1'), makeImage('2')];
    const renderer = await renderGrid({
      messages, mine: true, tokens: lightTheme, onOpenViewer, onLongPressTile, selectionMode: true,
    });
    const tiles = findAllByTestId(renderer, 'media-grid-tile');
    act(() => {
      tiles[0].props.onPress();
      tiles[0].props.onLongPress();
    });
    expect(onOpenViewer).not.toHaveBeenCalled();
    expect(onLongPressTile).not.toHaveBeenCalled();
  });

  it('visibly dims tiles during selection mode instead of silently no-oping', async () => {
    const messages = [makeImage('1'), makeImage('2')];
    const activeRenderer = await renderGrid({
      messages, mine: true, tokens: lightTheme, onOpenViewer: jest.fn(), onLongPressTile: jest.fn(), selectionMode: true,
    });
    const dimmedTiles = findAllByTestId(activeRenderer, 'media-grid-tile');
    expect(dimmedTiles.every((t) => t.props.style.opacity === 0.5)).toBe(true);

    const normalRenderer = await renderGrid({
      messages, mine: true, tokens: lightTheme, onOpenViewer: jest.fn(), onLongPressTile: jest.fn(), selectionMode: false,
    });
    const normalTiles = findAllByTestId(normalRenderer, 'media-grid-tile');
    expect(normalTiles.every((t) => t.props.style.opacity === 1)).toBe(true);
  });

  it('flashes only the tile matching highlightedMessageId — jumping to a grouped image still confirms which photo it landed on', async () => {
    const messages = [makeImage('1'), makeImage('2'), makeImage('3')];
    const renderer = await renderGrid({
      messages, mine: true, tokens: lightTheme, onOpenViewer: jest.fn(), onLongPressTile: jest.fn(),
      highlightedMessageId: messages[2].id,
    });
    const highlightOverlays = renderer.root.findAllByType(Animated.View).filter((n) => n.props.testID === 'media-grid-tile-highlight');
    expect(highlightOverlays).toHaveLength(3);
    const opacities = highlightOverlays.map((h) => {
      const style = h.props.style as Array<{ opacity?: { __getValue: () => number } }>;
      return style[1].opacity!.__getValue();
    });
    expect(opacities[0]).toBe(0);
    expect(opacities[1]).toBe(0);
    expect(opacities[2]).toBeGreaterThan(0);
  });

  it('shows the sender name when not mine', async () => {
    const messages = [makeImage('1'), makeImage('2')];
    const renderer = await renderGrid({ messages, mine: false, tokens: lightTheme, onOpenViewer: jest.fn(), onLongPressTile: jest.fn() });
    expect(findTextByContent(renderer, 'Alice')).toBeDefined();
  });
});
