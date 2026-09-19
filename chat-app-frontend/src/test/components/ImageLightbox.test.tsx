import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ImageLightbox from '../../components/chat/ImageLightbox'

const images = [
  { url: 'https://res.cloudinary.com/demo/image/upload/a.jpg', alt: 'a' },
  { url: 'https://res.cloudinary.com/demo/image/upload/b.jpg', alt: 'b' },
  { url: 'https://res.cloudinary.com/demo/image/upload/c.jpg', alt: 'c' },
]

describe('ImageLightbox', () => {
  it('renders the image at the given initial index', () => {
    render(<ImageLightbox images={images} initialIndex={1} onClose={vi.fn()} />)
    expect(screen.getByTestId('lightbox-image')).toHaveAttribute('src', images[1].url)
    expect(screen.getByTestId('lightbox-counter')).toHaveTextContent('2 / 3')
  })

  it('clamps an out-of-range initial index into bounds', () => {
    render(<ImageLightbox images={images} initialIndex={99} onClose={vi.fn()} />)
    expect(screen.getByTestId('lightbox-image')).toHaveAttribute('src', images[2].url)
  })

  it('navigates to the next image on next-button click, wrapping past the last', () => {
    render(<ImageLightbox images={images} initialIndex={2} onClose={vi.fn()} />)
    fireEvent.click(screen.getByTestId('lightbox-next-btn'))
    expect(screen.getByTestId('lightbox-image')).toHaveAttribute('src', images[0].url)
  })

  it('navigates to the previous image on prev-button click, wrapping before the first', () => {
    render(<ImageLightbox images={images} initialIndex={0} onClose={vi.fn()} />)
    fireEvent.click(screen.getByTestId('lightbox-prev-btn'))
    expect(screen.getByTestId('lightbox-image')).toHaveAttribute('src', images[2].url)
  })

  it('navigates with ArrowRight/ArrowLeft keys', () => {
    render(<ImageLightbox images={images} initialIndex={0} onClose={vi.fn()} />)
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(screen.getByTestId('lightbox-image')).toHaveAttribute('src', images[1].url)
    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(screen.getByTestId('lightbox-image')).toHaveAttribute('src', images[0].url)
  })

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn()
    render(<ImageLightbox images={images} initialIndex={0} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<ImageLightbox images={images} initialIndex={0} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('image-lightbox'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not close when the image itself is clicked', () => {
    const onClose = vi.fn()
    render(<ImageLightbox images={images} initialIndex={0} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('lightbox-image'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<ImageLightbox images={images} initialIndex={0} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('lightbox-close-btn'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('hides prev/next/counter controls for a single image', () => {
    render(<ImageLightbox images={[images[0]]} initialIndex={0} onClose={vi.fn()} />)
    expect(screen.queryByTestId('lightbox-prev-btn')).not.toBeInTheDocument()
    expect(screen.queryByTestId('lightbox-next-btn')).not.toBeInTheDocument()
    expect(screen.queryByTestId('lightbox-counter')).not.toBeInTheDocument()
  })

  it('renders nothing for an empty image list', () => {
    const { container } = render(<ImageLightbox images={[]} initialIndex={0} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
