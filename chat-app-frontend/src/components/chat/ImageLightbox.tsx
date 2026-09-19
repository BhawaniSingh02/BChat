import { useEffect, useState } from 'react'

export interface LightboxImage {
  url: string
  alt?: string
}

interface ImageLightboxProps {
  images: LightboxImage[]
  initialIndex: number
  onClose: () => void
}

/**
 * Full-screen tap-to-view image viewer. Supports prev/next (click arrows or ArrowLeft/
 * ArrowRight keys) when opened with more than one image, and Escape/backdrop-click to close.
 */
export default function ImageLightbox({ images, initialIndex, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(Math.min(Math.max(initialIndex, 0), images.length - 1))

  const goPrev = () => setIndex((i) => (i - 1 + images.length) % images.length)
  const goNext = () => setIndex((i) => (i + 1) % images.length)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && images.length > 1) goPrev()
      else if (e.key === 'ArrowRight' && images.length > 1) goNext()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length, onClose])

  if (images.length === 0) return null
  const current = images[index]

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
      data-testid="image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
        aria-label="Close"
        data-testid="lightbox-close-btn"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {images.length > 1 && (
        <span
          className="absolute top-4 left-4 text-white/80 text-sm font-medium bg-black/40 rounded-full px-3 py-1"
          data-testid="lightbox-counter"
        >
          {index + 1} / {images.length}
        </span>
      )}

      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev() }}
          className="absolute left-2 sm:left-4 w-11 h-11 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
          aria-label="Previous image"
          data-testid="lightbox-prev-btn"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <img
        src={current.url}
        alt={current.alt ?? 'shared'}
        onClick={(e) => e.stopPropagation()}
        className="max-w-[92vw] max-h-[88vh] object-contain select-none"
        data-testid="lightbox-image"
      />

      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext() }}
          className="absolute right-2 sm:right-4 w-11 h-11 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
          aria-label="Next image"
          data-testid="lightbox-next-btn"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}
