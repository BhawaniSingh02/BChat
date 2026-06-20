import { useEffect, useMemo, useState } from 'react'
import { useStoryStore } from '../../store/storyStore'
import { useUserCacheStore } from '../../store/userCacheStore'
import Avatar from '../ui/Avatar'
import StoryComposer from './StoryComposer'
import StoryViewer from './StoryViewer'

interface StoriesBarProps {
  currentUsername: string
}

export default function StoriesBar({ currentUsername }: StoriesBarProps) {
  const groups = useStoryStore((s) => s.groups)
  const fetchFeed = useStoryStore((s) => s.fetchFeed)
  const cache = useUserCacheStore((s) => s.cache)
  const prefetch = useUserCacheStore((s) => s.prefetch)

  const [composerOpen, setComposerOpen] = useState(false)
  const [viewerStart, setViewerStart] = useState<number | null>(null)

  useEffect(() => {
    void fetchFeed()
  }, [fetchFeed])

  useEffect(() => {
    const authors = groups.map((g) => g.authorId).filter((a) => a !== currentUsername)
    if (authors.length) prefetch(authors)
  }, [groups, currentUsername, prefetch])

  const ownGroup = useMemo(() => groups.find((g) => g.authorId === currentUsername), [groups, currentUsername])
  const otherGroups = useMemo(() => groups.filter((g) => g.authorId !== currentUsername), [groups, currentUsername])

  const openViewerForAuthor = (authorId: string) => {
    const idx = groups.findIndex((g) => g.authorId === authorId)
    if (idx >= 0) setViewerStart(idx)
  }

  return (
    <div className="border-b border-gray-100 dark:border-gray-800" data-testid="stories-bar">
      <div className="flex gap-3 overflow-x-auto px-4 py-3">
        {/* Your story */}
        <button
          onClick={() => (ownGroup ? openViewerForAuthor(currentUsername) : setComposerOpen(true))}
          className="flex w-16 flex-shrink-0 flex-col items-center gap-1"
          data-testid="your-story-tile"
        >
          <div className="relative">
            <span className={ownGroup ? `block rounded-full p-[2px] ${ownGroup.hasUnviewed ? 'bg-gradient-to-tr from-teal-500 to-cyan-500' : 'bg-gray-300 dark:bg-gray-600'}` : 'block'}>
              <span className="block rounded-full ring-2 ring-white dark:ring-[#111b21]">
                <Avatar name="You" size="md" src={cache[currentUsername]?.avatarUrl ?? undefined} />
              </span>
            </span>
            <span
              onClick={(e) => { e.stopPropagation(); setComposerOpen(true) }}
              className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-teal-600 text-white dark:border-[#111b21]"
              data-testid="add-story-badge"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </span>
          </div>
          <span className="max-w-full truncate text-[11px] text-gray-600 dark:text-gray-400">Your story</span>
        </button>

        {/* Others */}
        {otherGroups.map((g) => {
          const u = cache[g.authorId]
          const label = u?.displayName || (u?.uniqueHandle ? `@${u.uniqueHandle}` : '…')
          return (
            <button
              key={g.authorId}
              onClick={() => openViewerForAuthor(g.authorId)}
              className="flex w-16 flex-shrink-0 flex-col items-center gap-1"
              data-testid="story-tile"
            >
              <span className={`block rounded-full p-[2px] ${g.hasUnviewed ? 'bg-gradient-to-tr from-teal-500 to-cyan-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <span className="block rounded-full ring-2 ring-white dark:ring-[#111b21]">
                  <Avatar name={label} size="md" src={u?.avatarUrl ?? undefined} />
                </span>
              </span>
              <span className="max-w-full truncate text-[11px] text-gray-600 dark:text-gray-400">{label}</span>
            </button>
          )
        })}
      </div>

      <StoryComposer open={composerOpen} onClose={() => setComposerOpen(false)} />
      {viewerStart !== null && (
        <StoryViewer
          groups={groups}
          startGroupIndex={viewerStart}
          currentUsername={currentUsername}
          onClose={() => setViewerStart(null)}
        />
      )}
    </div>
  )
}
