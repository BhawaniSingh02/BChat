import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MediaGrid from '../../components/chat/MediaGrid'
import type { MessageRowCallbacks } from '../../components/chat/messageListShared'
import type { Message } from '../../types'

function makeImage(id: string, overrides: Partial<Message> = {}): Message {
  return {
    id,
    roomId: 'general',
    sender: 'alice',
    senderName: 'alice',
    content: `photo${id}.jpg`,
    messageType: 'IMAGE',
    fileUrl: `https://res.cloudinary.com/demo/image/upload/photo${id}.jpg`,
    readBy: [],
    starred: [],
    timestamp: '2026-03-28T10:00:00Z',
    ...overrides,
  }
}

const baseCallbacks: MessageRowCallbacks = { currentUsername: 'alice' }

describe('MediaGrid', () => {
  it('renders one tile per image when there are 4 or fewer', () => {
    const messages = [makeImage('1'), makeImage('2'), makeImage('3')]
    render(<MediaGrid messages={messages} isMine isGrouped={false} callbacks={baseCallbacks} />)
    expect(screen.getAllByTestId('media-grid-tile')).toHaveLength(3)
    expect(screen.queryByTestId('media-grid-overflow')).not.toBeInTheDocument()
  })

  it('caps at 4 visible tiles and shows a "+N" overflow badge on the last one', () => {
    const messages = [makeImage('1'), makeImage('2'), makeImage('3'), makeImage('4'), makeImage('5'), makeImage('6')]
    render(<MediaGrid messages={messages} isMine isGrouped={false} callbacks={baseCallbacks} />)
    expect(screen.getAllByTestId('media-grid-tile')).toHaveLength(4)
    expect(screen.getByTestId('media-grid-overflow')).toHaveTextContent('+2')
  })

  it('opens the lightbox at the tapped tile index, navigable across the whole run including overflowed images', () => {
    const messages = [makeImage('1'), makeImage('2'), makeImage('3'), makeImage('4'), makeImage('5')]
    render(<MediaGrid messages={messages} isMine isGrouped={false} callbacks={baseCallbacks} />)

    fireEvent.click(screen.getAllByTestId('media-grid-tile')[2])
    expect(screen.getByTestId('lightbox-image')).toHaveAttribute('src', messages[2].fileUrl)
    expect(screen.getByTestId('lightbox-counter')).toHaveTextContent('3 / 5')

    // Navigate forward past the visible tiles into the overflowed (5th) image
    fireEvent.click(screen.getByTestId('lightbox-next-btn'))
    fireEvent.click(screen.getByTestId('lightbox-next-btn'))
    expect(screen.getByTestId('lightbox-image')).toHaveAttribute('src', messages[4].fileUrl)
  })

  it('shows a per-tile options menu on hover with the single-message actions, not a group-level menu', () => {
    const onDropdownAction = vi.fn()
    const messages = [makeImage('1'), makeImage('2')]
    render(
      <MediaGrid
        messages={messages}
        isMine
        isGrouped={false}
        callbacks={{ ...baseCallbacks, onDropdownAction }}
      />,
    )

    const tiles = screen.getAllByTestId('media-grid-tile')
    fireEvent.mouseEnter(tiles[0])
    fireEvent.click(screen.getByTestId('media-grid-tile-menu-trigger'))
    expect(screen.getByTestId('media-grid-tile-menu')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('dropdown-star'))
    expect(onDropdownAction).toHaveBeenCalledWith('star', messages[0])
    // Menu closes after the action and doesn't leak into the second tile
    expect(screen.queryByTestId('media-grid-tile-menu')).not.toBeInTheDocument()
  })

  it('does not open the lightbox when tapping a tile in selection mode', () => {
    const messages = [makeImage('1'), makeImage('2')]
    render(
      <MediaGrid
        messages={messages}
        isMine
        isGrouped={false}
        callbacks={{ ...baseCallbacks, selectionMode: true }}
      />,
    )
    fireEvent.click(screen.getAllByTestId('media-grid-tile')[0])
    expect(screen.queryByTestId('image-lightbox')).not.toBeInTheDocument()
  })

  it('visibly dims tiles during selection mode instead of silently no-oping', () => {
    const messages = [makeImage('1'), makeImage('2')]
    const { rerender } = render(
      <MediaGrid messages={messages} isMine isGrouped={false} callbacks={{ ...baseCallbacks, selectionMode: true }} />,
    )
    for (const tile of screen.getAllByTestId('media-grid-tile')) {
      expect(tile).toHaveClass('opacity-50')
      expect(tile).not.toHaveClass('cursor-pointer')
    }

    rerender(<MediaGrid messages={messages} isMine isGrouped={false} callbacks={baseCallbacks} />)
    for (const tile of screen.getAllByTestId('media-grid-tile')) {
      expect(tile).not.toHaveClass('opacity-50')
      expect(tile).toHaveClass('cursor-pointer')
    }
  })

  it('gives every tile a msg-{id} DOM anchor, including non-first tiles', () => {
    const messages = [makeImage('1'), makeImage('2'), makeImage('3')]
    render(<MediaGrid messages={messages} isMine isGrouped={false} callbacks={baseCallbacks} />)
    expect(document.getElementById('msg-1')).not.toBeNull()
    expect(document.getElementById('msg-2')).not.toBeNull()
    expect(document.getElementById('msg-3')).not.toBeNull()
  })
})
