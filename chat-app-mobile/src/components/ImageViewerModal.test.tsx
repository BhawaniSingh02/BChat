import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Dimensions, FlatList, Modal, TouchableOpacity } from 'react-native';
import ImageViewerModal from './ImageViewerModal';

jest.mock('../utils/openFile', () => ({
  saveImageToDevice: jest.fn().mockResolvedValue(true),
}));

const images = [
  'https://res.cloudinary.com/demo/image/upload/a.jpg',
  'https://res.cloudinary.com/demo/image/upload/b.jpg',
  'https://res.cloudinary.com/demo/image/upload/c.jpg',
];

function findByTestId(renderer: ReactTestRenderer, testID: string) {
  return renderer.root.findAll((node) => node.props?.testID === testID)[0];
}

async function renderModal(props: React.ComponentProps<typeof ImageViewerModal>): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<ImageViewerModal {...props} />);
    await Promise.resolve();
  });
  return renderer;
}

describe('ImageViewerModal', () => {
  it('is not visible when images is empty', async () => {
    const renderer = await renderModal({ images: [], initialIndex: 0, onClose: jest.fn() });
    expect(renderer.root.findByType(Modal).props.visible).toBe(false);
  });

  it('is visible and shows the counter when opened with multiple images', async () => {
    const renderer = await renderModal({ images, initialIndex: 1, onClose: jest.fn() });
    expect(renderer.root.findByType(Modal).props.visible).toBe(true);
    const counter = findByTestId(renderer, 'image-viewer-counter');
    const joined = Array.isArray(counter.props.children) ? counter.props.children.join('') : counter.props.children;
    expect(joined).toBe('2 / 3');
  });

  it('hides the counter for a single image', async () => {
    const renderer = await renderModal({ images: [images[0]], initialIndex: 0, onClose: jest.fn() });
    expect(findByTestId(renderer, 'image-viewer-counter')).toBeUndefined();
  });

  it('starts the list scrolled to the given initial index', async () => {
    const renderer = await renderModal({ images, initialIndex: 2, onClose: jest.fn() });
    expect(renderer.root.findByType(FlatList).props.initialScrollIndex).toBe(2);
  });

  it('clamps an out-of-range initial index into bounds', async () => {
    const renderer = await renderModal({ images, initialIndex: 99, onClose: jest.fn() });
    expect(renderer.root.findByType(FlatList).props.initialScrollIndex).toBe(2);
  });

  it('updates the counter after a swipe (onMomentumScrollEnd)', async () => {
    const renderer = await renderModal({ images, initialIndex: 0, onClose: jest.fn() });
    const screenWidth = Dimensions.get('window').width;
    const list = renderer.root.findByType(FlatList);
    act(() => {
      // Landed on page 2 (index 2) after a two-page swipe
      list.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: screenWidth * 2 } } });
    });
    const counter = findByTestId(renderer, 'image-viewer-counter');
    const joined = Array.isArray(counter.props.children) ? counter.props.children.join('') : counter.props.children;
    expect(joined).toBe('3 / 3');
  });

  it('calls onClose when the close button is tapped', async () => {
    const onClose = jest.fn();
    const renderer = await renderModal({ images, initialIndex: 0, onClose });
    const closeBtn = findByTestId(renderer, 'image-viewer-close');
    act(() => {
      closeBtn.props.onPress();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the image itself is tapped', async () => {
    const onClose = jest.fn();
    const renderer = await renderModal({ images, initialIndex: 0, onClose });
    const imageWrap = renderer.root.findAllByType(TouchableOpacity)[0];
    act(() => {
      imageWrap.props.onPress();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
