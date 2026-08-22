import { useCallback, useEffect, useRef, useState } from 'react'
import type { StoryGroup } from '../../types'
import { useStoryStore } from '../../store/storyStore'
import { useUserCacheStore } from '../../store/userCacheStore'
import { storiesApi } from '../../api/stories'
import Avatar from '../ui/Avatar'
import { formatRelative } from '../../utils/date'
import { backgroundClass } from './StoryComposer'

interface StoryViewerProps {
  groups: StoryGroup[]
  startGroupIndex: number
  currentUsername: string
  onClose: () => void
}

const STORY_DURATION = 5000
const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👍']

export default function StoryViewer({ groups, startGroupIndex, currentUsername, onClose }: StoryViewerProps) {
  const [groupIndex, setGroupIndex] = useState(startGroupIndex)
  const [storyIndex, setStoryIndex] = useState(0)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [replyFocused, setReplyFocused] = useState(false)
  const [manualPaused, setManualPaused] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showViewers, setShowViewers] = useState(false)
  const [viewers, setViewers] = useState<string[]>([])
  const [viewersLoading, setViewersLoading] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const [reacted, setReacted] = useState(false)
  // Gate the timer/progress-bar on the media actually being ready to show — on a
  // slow connection the bar must not run (and the story must not auto-advance)
  // before the image/video has loaded, matching WhatsApp/Instagram behavior.
  const [mediaLoading, setMediaLoading] = useState(false)
  const [mediaFailed, setMediaFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const markViewed = useStoryStore((s) => s.markViewed)
  const deleteStory = useStoryStore((s) => s.deleteStory)
  const reactToStory = useStoryStore((s) => s.reactToStory)
  const cache = useUserCacheStore((s) => s.cache)
  const prefetch = useUserCacheStore((s) => s.prefetch)

  const group = groups[groupIndex]
  const story = group?.stories[storyIndex]

  // Auto-advance is suspended while: composing a reply, manually paused, or the
  // viewers sheet is open.
  const isPaused = replyFocused || manualPaused || showViewers || confirmDelete

  const goNext = useCallback(() => {
    const g = groups[groupIndex]
    if (g && storyIndex < g.stories.length - 1) {
      setStoryIndex(storyIndex + 1)
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(groupIndex + 1)
      setStoryIndex(0)
    } else {
      onClose()
    }
  }, [groups, groupIndex, storyIndex, onClose])

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1)
    } else if (groupIndex > 0) {
      const prev = groups[groupIndex - 1]
      setGroupIndex(groupIndex - 1)
      setStoryIndex(Math.max(0, prev.stories.length - 1))
    }
  }, [storyIndex, groupIndex, groups])

  // Mark the current story viewed (never your own).
  useEffect(() => {
    if (story && story.authorId !== currentUsername && !story.viewedByMe) {
      void markViewed(story.id)
    }
  }, [story, currentUsername, markViewed])

  // Auto-advance, restarted on each story; suspended when paused, or while the
  // media hasn't finished loading yet. Video stories advance on their own
  // `onEnded` event instead of this fixed timer.
  useEffect(() => {
    if (!story || isPaused || story.type === 'VIDEO' || mediaLoading) return
    const t = setTimeout(goNext, STORY_DURATION)
    return () => clearTimeout(t)
  }, [groupIndex, storyIndex, story, goNext, isPaused, mediaLoading])

  // A story that failed to load entirely (broken URL, offline) shouldn't strand
  // the viewer — skip it after a brief pause instead of hanging forever.
  useEffect(() => {
    if (!mediaFailed) return
    const t = setTimeout(goNext, 1500)
    return () => clearTimeout(t)
  }, [mediaFailed, goNext])

  // Keep the video element's play state in sync with the pause/play controls.
  useEffect(() => {
    const v = videoRef.current
    if (!v || story?.type !== 'VIDEO') return
    if (isPaused) v.pause()
    else v.play()?.catch?.(() => {})
  }, [isPaused, story])

  // Reset transient per-story state when the story changes.
  useEffect(() => {
    setReplyText('')
    setSent(false)
    setReacted(false)
    setManualPaused(false)
    setShowViewers(false)
    setConfirmDelete(false)
    setVideoProgress(0)
    setMediaFailed(false)
  }, [groupIndex, storyIndex])

  // Media-loading state depends on the story's type — reset per story, and as
  // soon as the type is known (TEXT never "loads", IMAGE/VIDEO start pending).
  useEffect(() => {
    setMediaLoading(story?.type === 'IMAGE' || story?.type === 'VIDEO')
  }, [groupIndex, storyIndex, story?.type])

  // Keyboard controls.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (showViewers) setShowViewers(false); else onClose() }
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === ' ') setManualPaused((p) => !p)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, goNext, goPrev, showViewers])

  if (!group || !story) return null

  const u = cache[story.authorId]
  const isOwn = story.authorId === currentUsername
  const name = isOwn ? 'Your story' : (u?.displayName || (u?.uniqueHandle ? `@${u.uniqueHandle}` : 'Someone'))

  const handleDelete = async () => {
    const wasOnly = group.stories.length <= 1
    setConfirmDelete(false)
    await deleteStory(story.id)
    if (wasOnly) onClose()
    else setStoryIndex((si) => Math.max(0, si - 1))
  }

  const handleReply = async () => {
    const text = replyText.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await storiesApi.reply(story.id, text)
      setReplyText('')
      setSent(true)
      setTimeout(() => setSent(false), 2000)
    } catch { /* ignore — user can retry */ }
    finally { setSending(false) }
  }

  const handleQuickReact = async (emoji: string) => {
    await reactToStory(story.id, emoji)
    setReacted(true)
    setTimeout(() => setReacted(false), 1500)
  }

  const openViewers = async () => {
    setShowViewers(true)
    setViewersLoading(true)
    try {
      const list = await storiesApi.getViewers(story.id)
      setViewers(list)
      if (list.length) prefetch(list)
    } catch {
      setViewers([])
    } finally {
      setViewersLoading(false)
    }
  }

  const atFirst = groupIndex === 0 && storyIndex === 0

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center gap-3 bg-black/95 md:p-4" data-testid="story-viewer">
      {/* Desktop prev arrow */}
      <button
        onClick={goPrev}
        disabled={atFirst}
        className="hidden h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30 md:flex"
        aria-label="Previous story"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="relative h-full w-full max-w-md overflow-hidden bg-black md:h-[88vh] md:max-h-[760px] md:rounded-2xl md:shadow-2xl">
        {/* Progress bars */}
        <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 px-3 pt-3">
          {group.stories.map((s, i) => (
            <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              {i === storyIndex && s.type === 'VIDEO' ? (
                <div className="h-full bg-white" style={{ width: `${videoProgress}%` }} />
              ) : (
                <div
                  key={i === storyIndex ? `${groupIndex}-${storyIndex}` : `static-${i}`}
                  className={`h-full bg-white ${
                    i < storyIndex
                      ? 'w-full'
                      : i === storyIndex
                        ? (mediaLoading ? 'w-0' : `story-progress ${isPaused ? 'is-paused' : ''}`)
                        : 'w-0'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute left-0 right-0 top-0 z-20 flex items-center gap-3 px-4 pt-6">
          <Avatar name={name} size="sm" src={u?.avatarUrl ?? undefined} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{name}</p>
            <p className="text-xs text-white/70">{formatRelative(story.createdAt)}</p>
          </div>
          {/* Pause / play */}
          <button
            onClick={() => setManualPaused((p) => !p)}
            className="text-white/80 hover:text-white"
            aria-label={manualPaused ? 'Play story' : 'Pause story'}
            data-testid="story-pause-btn"
          >
            {manualPaused ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
            )}
          </button>
          {isOwn && (
            <button onClick={() => setConfirmDelete(true)} className="text-white/80 hover:text-white" aria-label="Delete story" data-testid="story-delete-btn">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <button onClick={onClose} className="text-white/80 hover:text-white" aria-label="Close stories" data-testid="story-viewer-close">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {story.type === 'TEXT' ? (
          <div className={`flex h-full w-full items-center justify-center p-8 ${backgroundClass(story.backgroundColor)}`}>
            <p className="text-center text-2xl font-semibold leading-snug text-white" data-testid="story-text-content">{story.content}</p>
          </div>
        ) : story.type === 'VIDEO' ? (
          <div className="flex h-full w-full items-center justify-center bg-black">
            {!mediaFailed && (
              <video
                ref={videoRef}
                src={story.mediaUrl}
                className="max-h-full max-w-full object-contain"
                autoPlay
                playsInline
                onTimeUpdate={(e) => {
                  const v = e.currentTarget
                  if (v.duration) setVideoProgress((v.currentTime / v.duration) * 100)
                }}
                onLoadedData={() => setMediaLoading(false)}
                onWaiting={() => setMediaLoading(true)}
                onPlaying={() => setMediaLoading(false)}
                onEnded={goNext}
                onError={() => { setMediaLoading(false); setMediaFailed(true) }}
                data-testid="story-video-content"
              />
            )}
            {story.content && !mediaFailed && (
              <p className="absolute bottom-16 left-0 right-0 px-6 text-center text-sm text-white drop-shadow">{story.content}</p>
            )}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black">
            {!mediaFailed && (
              <img
                src={story.mediaUrl}
                alt="Story"
                className="max-h-full max-w-full object-contain"
                onLoad={() => setMediaLoading(false)}
                onError={() => { setMediaLoading(false); setMediaFailed(true) }}
                data-testid="story-image-content"
              />
            )}
            {story.content && !mediaFailed && (
              <p className="absolute bottom-16 left-0 right-0 px-6 text-center text-sm text-white drop-shadow">{story.content}</p>
            )}
          </div>
        )}

        {/* Loading / failed states — matches WhatsApp/Instagram not racing the
            progress bar ahead of media that hasn't actually loaded yet. */}
        {story.type !== 'TEXT' && mediaLoading && !mediaFailed && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30" data-testid="story-media-loading">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        )}
        {mediaFailed && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black" data-testid="story-media-failed">
            <p className="text-sm text-white/70">Couldn&apos;t load this story</p>
          </div>
        )}

        {/* Tap zones (stop above the bottom bar so the reply input stays usable) */}
        <button className={`absolute left-0 top-0 z-10 w-1/3 cursor-default ${isOwn ? 'bottom-20' : 'bottom-32'}`} onClick={goPrev} aria-label="Previous" data-testid="story-prev-zone" />
        <button className={`absolute right-0 top-0 z-10 w-2/3 cursor-default ${isOwn ? 'bottom-20' : 'bottom-32'}`} onClick={goNext} aria-label="Next" data-testid="story-next-zone" />

        {/* Bottom bar: viewers button for own stories, reply box for others' */}
        {isOwn ? (
          <div className="absolute bottom-5 left-0 right-0 z-20 flex justify-center">
            <button
              onClick={openViewers}
              className="flex items-center gap-1.5 rounded-full bg-black/40 px-4 py-2 text-sm text-white transition-colors hover:bg-black/60"
              data-testid="story-seen-count"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {story.viewerCount} {story.viewerCount === 1 ? 'view' : 'views'}
            </button>
          </div>
        ) : (
          <div className="absolute bottom-0 left-0 right-0 z-20 p-3">
            {sent && <p className="mb-2 text-center text-xs text-white/80" data-testid="story-reply-sent">Reply sent ✓</p>}
            {reacted && <p className="mb-2 text-center text-xs text-white/80" data-testid="story-react-sent">Reaction sent ✓</p>}
            <div className="mb-2 flex items-center justify-center gap-3" data-testid="story-quick-reactions">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleQuickReact(emoji)}
                  className={`text-2xl transition-transform hover:scale-125 ${story.myReaction === emoji ? 'scale-125' : ''}`}
                  aria-label={`React with ${emoji}`}
                  data-testid={`story-quick-react-${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onFocus={() => setReplyFocused(true)}
                onBlur={() => setReplyFocused(false)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleReply() }}
                placeholder={`Reply to ${name}…`}
                className="flex-1 rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40"
                data-testid="story-reply-input"
              />
              <button
                onClick={handleReply}
                disabled={!replyText.trim() || sending}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-500 text-white transition-colors hover:bg-teal-600 disabled:opacity-40"
                aria-label="Send reply"
                data-testid="story-reply-send"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {confirmDelete && (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
            onClick={() => setConfirmDelete(false)}
            data-testid="story-delete-confirm"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[20rem] overflow-hidden rounded-3xl border border-white/10 bg-[#202c33]/95 p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
            >
              <h3 className="text-lg font-semibold text-white">Delete story?</h3>
              <p className="mx-auto mt-1.5 max-w-[15rem] text-sm leading-relaxed text-gray-400">
                This story will be removed for everyone who can see it.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-xl bg-white/10 py-2.5 text-sm font-semibold text-gray-100 transition-colors hover:bg-white/15"
                  data-testid="story-delete-cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition-colors hover:bg-red-600"
                  data-testid="story-delete-confirm-btn"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Viewers sheet (WhatsApp-style "Viewed by" list) */}
        {showViewers && (
          <div className="absolute inset-0 z-30 flex flex-col" data-testid="story-viewers-sheet">
            <button className="flex-1 cursor-default" onClick={() => setShowViewers(false)} aria-label="Close viewers" />
            <div className="max-h-[65%] overflow-hidden rounded-t-2xl bg-[#1a242b] shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-100">
                  Viewed by {viewers.length}
                </h3>
                <button onClick={() => setShowViewers(false)} className="text-gray-400 hover:text-gray-200" aria-label="Close" data-testid="story-viewers-close">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              <div className="max-h-[calc(65vh-3rem)] overflow-y-auto py-1">
                {viewersLoading ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-400">Loading…</p>
                ) : viewers.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-400" data-testid="story-viewers-empty">No views yet</p>
                ) : (
                  viewers.map((vid) => {
                    const vu = cache[vid]
                    const vname = vu?.displayName || (vu?.uniqueHandle ? `@${vu.uniqueHandle}` : '…')
                    return (
                      <div key={vid} className="flex items-center gap-3 px-4 py-2.5" data-testid="story-viewer-row">
                        <Avatar name={vname} size="sm" src={vu?.avatarUrl ?? undefined} />
                        <span className="truncate text-sm text-gray-100">{vname}</span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop next arrow */}
      <button
        onClick={goNext}
        className="hidden h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:flex"
        aria-label="Next story"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}
