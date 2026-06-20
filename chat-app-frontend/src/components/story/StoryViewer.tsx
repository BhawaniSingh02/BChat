import { useCallback, useEffect, useState } from 'react'
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

export default function StoryViewer({ groups, startGroupIndex, currentUsername, onClose }: StoryViewerProps) {
  const [groupIndex, setGroupIndex] = useState(startGroupIndex)
  const [storyIndex, setStoryIndex] = useState(0)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [paused, setPaused] = useState(false)
  const markViewed = useStoryStore((s) => s.markViewed)
  const deleteStory = useStoryStore((s) => s.deleteStory)
  const cache = useUserCacheStore((s) => s.cache)

  const group = groups[groupIndex]
  const story = group?.stories[storyIndex]

  // goNext/goPrev are recreated whenever the indices change, so the timer effect
  // below always closes over fresh state — no refs needed.
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

  // Auto-advance, restarted on each story. Paused while composing a reply.
  useEffect(() => {
    if (!story || paused) return
    const t = setTimeout(goNext, STORY_DURATION)
    return () => clearTimeout(t)
  }, [groupIndex, storyIndex, story, goNext, paused])

  // Reset the reply box when the story changes.
  useEffect(() => { setReplyText(''); setSent(false) }, [groupIndex, storyIndex])

  // Keyboard controls.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, goNext, goPrev])

  if (!group || !story) return null

  const u = cache[story.authorId]
  const isOwn = story.authorId === currentUsername
  const name = isOwn ? 'Your story' : (u?.displayName || (u?.uniqueHandle ? `@${u.uniqueHandle}` : 'Someone'))

  const handleDelete = async () => {
    const wasOnly = group.stories.length <= 1
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
              <div
                key={i === storyIndex ? `${groupIndex}-${storyIndex}` : `static-${i}`}
                className={`h-full bg-white ${i < storyIndex ? 'w-full' : i === storyIndex ? `story-progress ${paused ? '[animation-play-state:paused]' : ''}` : 'w-0'}`}
              />
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
          {isOwn && (
            <button onClick={handleDelete} className="text-white/80 hover:text-white" aria-label="Delete story" data-testid="story-delete-btn">
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
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black">
            <img src={story.mediaUrl} alt="Story" className="max-h-full max-w-full object-contain" data-testid="story-image-content" />
            {story.content && (
              <p className="absolute bottom-16 left-0 right-0 px-6 text-center text-sm text-white drop-shadow">{story.content}</p>
            )}
          </div>
        )}

        {/* Tap zones (stop above the bottom bar so the reply input stays usable) */}
        <button className="absolute bottom-20 left-0 top-0 z-10 w-1/3 cursor-default" onClick={goPrev} aria-label="Previous" data-testid="story-prev-zone" />
        <button className="absolute bottom-20 right-0 top-0 z-10 w-2/3 cursor-default" onClick={goNext} aria-label="Next" data-testid="story-next-zone" />

        {/* Bottom bar: seen count for own stories, reply box for others' */}
        {isOwn ? (
          <div className="absolute bottom-5 left-0 right-0 z-20 flex justify-center">
            <span className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-sm text-white" data-testid="story-seen-count">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {story.viewerCount}
            </span>
          </div>
        ) : (
          <div className="absolute bottom-0 left-0 right-0 z-20 p-3">
            {sent && <p className="mb-2 text-center text-xs text-white/80" data-testid="story-reply-sent">Reply sent ✓</p>}
            <div className="flex items-center gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
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
