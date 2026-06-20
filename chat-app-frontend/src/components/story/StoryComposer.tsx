import { useRef, useState } from 'react'
import { useStoryStore } from '../../store/storyStore'
import { uploadApi } from '../../api/upload'

interface StoryComposerProps {
  open: boolean
  onClose: () => void
}

// Background options for text stories (Tailwind gradient classes, stored by key).
const BACKGROUNDS: { key: string; className: string }[] = [
  { key: 'teal', className: 'bg-gradient-to-br from-teal-500 to-cyan-600' },
  { key: 'violet', className: 'bg-gradient-to-br from-violet-500 to-fuchsia-600' },
  { key: 'sunset', className: 'bg-gradient-to-br from-orange-500 to-rose-600' },
  { key: 'slate', className: 'bg-gradient-to-br from-slate-700 to-slate-900' },
  { key: 'emerald', className: 'bg-gradient-to-br from-emerald-500 to-green-700' },
  { key: 'ocean', className: 'bg-gradient-to-br from-sky-500 to-indigo-700' },
]

export function backgroundClass(key: string | undefined): string {
  return BACKGROUNDS.find((b) => b.key === key)?.className ?? BACKGROUNDS[0].className
}

export default function StoryComposer({ open, onClose }: StoryComposerProps) {
  const createStory = useStoryStore((s) => s.createStory)
  const [text, setText] = useState('')
  const [bg, setBg] = useState(BACKGROUNDS[0].key)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const reset = () => { setText(''); setBg(BACKGROUNDS[0].key); setError(null); setPosting(false) }
  const close = () => { reset(); onClose() }

  const handlePostText = async () => {
    if (!text.trim() || posting) return
    setPosting(true)
    setError(null)
    try {
      await createStory({ type: 'TEXT', content: text.trim(), backgroundColor: bg })
      close()
    } catch {
      setError('Could not post your story. Try again.')
      setPosting(false)
    }
  }

  const handlePickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPosting(true)
    setError(null)
    try {
      const { url } = await uploadApi.uploadFile(file)
      await createStory({ type: 'IMAGE', mediaUrl: url, content: text.trim() || undefined })
      close()
    } catch {
      setError('Could not upload the image. Try again.')
      setPosting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" data-testid="story-composer">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#1a242b]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Add to your story</h3>
          <button onClick={close} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Close" data-testid="story-composer-close">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Text story preview */}
          <div className={`relative flex min-h-44 items-center justify-center rounded-xl p-5 ${backgroundClass(bg)}`}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a status…"
              maxLength={700}
              className="w-full resize-none bg-transparent text-center text-lg font-semibold text-white placeholder:text-white/70 focus:outline-none"
              rows={3}
              data-testid="story-text-input"
            />
          </div>

          {/* Background picker */}
          <div className="flex flex-wrap gap-2">
            {BACKGROUNDS.map((b) => (
              <button
                key={b.key}
                onClick={() => setBg(b.key)}
                className={`h-7 w-7 rounded-full ${b.className} ${bg === b.key ? 'ring-2 ring-offset-2 ring-teal-500 dark:ring-offset-[#1a242b]' : ''}`}
                aria-label={`Background ${b.key}`}
                data-testid={`story-bg-${b.key}`}
              />
            ))}
          </div>

          {error && <p className="text-sm text-red-500" data-testid="story-composer-error">{error}</p>}

          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickImage} data-testid="story-image-input" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={posting}
              className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              data-testid="story-photo-btn"
            >
              📷 Photo
            </button>
            <button
              onClick={handlePostText}
              disabled={!text.trim() || posting}
              className="flex-1 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              data-testid="story-post-btn"
            >
              {posting ? 'Posting…' : 'Share'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
