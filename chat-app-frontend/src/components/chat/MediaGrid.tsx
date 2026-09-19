import { useEffect, useRef, useState } from 'react'
import type { Message } from '../../types'
import { MenuItem, type DropdownAction } from './MessageBubble'
import ImageLightbox from './ImageLightbox'
import type { MessageRowCallbacks } from './messageListShared'

const MAX_VISIBLE_TILES = 4

function GridTile({
  message, isMine, isLast, overflowCount, onOpen, callbacks,
}: {
  message: Message
  isMine: boolean
  isLast: boolean
  overflowCount: number
  onOpen: () => void
  callbacks: MessageRowCallbacks
}) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)

  const { currentUsername, onDropdownAction, onEnterSelectionMode, selectionMode } = callbacks
  const isStarredByMe = currentUsername ? (message.starred ?? []).includes(currentUsername) : false

  useEffect(() => {
    if (!showMenu) return
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        menuTriggerRef.current && !menuTriggerRef.current.contains(e.target as Node)
      ) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  const triggerAction = (action: DropdownAction) => {
    setShowMenu(false)
    onDropdownAction?.(action, message)
  }

  return (
    <div
      id={`msg-${message.id}`}
      className={`relative aspect-square overflow-hidden bg-gray-200 dark:bg-gray-700 ${
        selectionMode ? 'opacity-50 cursor-default' : 'cursor-pointer'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowMenu(false) }}
      onClick={selectionMode ? undefined : onOpen}
      data-testid="media-grid-tile"
    >
      {!loaded && !errored && <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700" />}
      {!errored && (
        <img
          src={message.fileUrl}
          alt="shared"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {errored && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-[10px] bg-gray-100 dark:bg-gray-800">
          Failed to load
        </div>
      )}

      {isLast && overflowCount > 0 && (
        <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white text-lg font-semibold" data-testid="media-grid-overflow">
          +{overflowCount}
        </div>
      )}

      {onDropdownAction && !selectionMode && (hovered || showMenu) && (
        <button
          ref={menuTriggerRef}
          onClick={(e) => { e.stopPropagation(); setShowMenu((s) => !s) }}
          className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
          aria-label="Photo options"
          data-testid="media-grid-tile-menu-trigger"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      {showMenu && (
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-8 ${isMine ? 'right-0' : 'left-0'} bg-white dark:bg-[#233138] rounded-2xl shadow-2xl border border-gray-100/80 dark:border-gray-700 z-40 py-1.5 min-w-[170px] overflow-hidden`}
          data-testid="media-grid-tile-menu"
        >
          <MenuItem
            testId="dropdown-reply"
            onClick={() => triggerAction('reply')}
            label="Reply"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            }
          />
          <MenuItem
            testId="dropdown-forward"
            onClick={() => triggerAction('forward')}
            label="Forward"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MenuItem
            testId="dropdown-star"
            onClick={() => triggerAction('star')}
            label={isStarredByMe ? 'Unstar' : 'Star'}
            icon={
              <svg fill={isStarredByMe ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className={`w-4 h-4 ${isStarredByMe ? 'text-yellow-400' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            }
          />
          <MenuItem
            testId="dropdown-select"
            onClick={() => { setShowMenu(false); onEnterSelectionMode?.(message) }}
            label="Select"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          {isMine && (
            <>
              <div className="h-px bg-gray-100 my-1" />
              <MenuItem
                testId="dropdown-delete"
                onClick={() => triggerAction('delete')}
                label="Delete"
                danger
                icon={
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                }
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Compact grid bubble for a run of consecutive images from the same sender (see
 * buildRenderUnits in messageListShared.tsx). Shows up to MAX_VISIBLE_TILES tiles, with a
 * "+N" overlay on the last tile when the run has more. Tapping any tile opens the full-screen
 * lightbox positioned at that photo, navigable across the whole run (including the ones
 * hidden behind "+N"). Per-tile hover reveals the same single-message action menu a lone
 * image bubble would show (Reply/Forward/Star/Select/Delete) — there is no group-level menu.
 */
export default function MediaGrid({
  messages, isMine, isGrouped, callbacks,
}: {
  messages: Message[]
  isMine: boolean
  isGrouped: boolean
  callbacks: MessageRowCallbacks
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const visible = messages.slice(0, MAX_VISIBLE_TILES)
  const overflowCount = messages.length - MAX_VISIBLE_TILES

  return (
    <div className="flex flex-col">
      <div
        className={`
          grid grid-cols-2 gap-0.5 w-64 max-w-full p-0.5 shadow-sm
          ${isMine
            ? `bg-[#dcf8c6] dark:bg-[#005c4b] rounded-t-2xl rounded-bl-2xl ${!isGrouped ? 'rounded-br-sm' : 'rounded-br-2xl'}`
            : `bg-white dark:bg-[#202c33] rounded-t-2xl rounded-br-2xl ${!isGrouped ? 'rounded-bl-sm' : 'rounded-bl-2xl'}`
          }
        `}
        data-testid="media-grid"
      >
        {visible.map((message, i) => (
          <GridTile
            key={message.id}
            message={message}
            isMine={isMine}
            isLast={i === MAX_VISIBLE_TILES - 1}
            overflowCount={overflowCount > 0 ? overflowCount : 0}
            onOpen={() => setLightboxIndex(i)}
            callbacks={callbacks}
          />
        ))}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={messages.map((m) => ({ url: m.fileUrl!, alt: 'shared' }))}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
