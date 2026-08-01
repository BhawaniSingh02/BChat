import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import type { Message } from '../types'

interface UseScrollAnchoringOptions {
  messages: Message[]
  containerRef: RefObject<HTMLElement | null>
  topSentinelRef: RefObject<HTMLElement | null>
  hasMoreOlder?: boolean
  isLoadingOlder?: boolean
  onLoadOlder?: () => void
  /** Called when messages change via append (new message) rather than prepend (older page loaded). */
  onAppend: () => void
  /** Extra signal (e.g. typing-indicator count) that should also trigger onAppend. */
  appendSignal?: unknown
}

/**
 * Shared scroll behavior for both the plain and virtualized message lists:
 * scroll-to-bottom on genuinely new messages (not on "load older" prepends),
 * keep the viewport visually anchored when older messages are prepended above
 * it, and trigger `onLoadOlder` when the top sentinel scrolls into view.
 *
 * `onAppend`/`onLoadOlder` are read via refs so callers can pass fresh
 * closures each render without retriggering the effects below.
 */
export function useScrollAnchoring({
  messages, containerRef, topSentinelRef, hasMoreOlder, isLoadingOlder, onLoadOlder, onAppend, appendSignal,
}: UseScrollAnchoringOptions) {
  const prevFirstIdRef = useRef(messages[0]?.id)
  const prevLastIdRef = useRef(messages[messages.length - 1]?.id)
  const preLoadHeightRef = useRef<number | null>(null)
  const onAppendRef = useRef(onAppend)
  onAppendRef.current = onAppend
  const onLoadOlderRef = useRef(onLoadOlder)
  onLoadOlderRef.current = onLoadOlder

  useEffect(() => {
    const firstId = messages[0]?.id
    const lastId = messages[messages.length - 1]?.id
    const isPrepend = firstId !== prevFirstIdRef.current && lastId === prevLastIdRef.current
    if (!isPrepend) onAppendRef.current()
    prevFirstIdRef.current = firstId
    prevLastIdRef.current = lastId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, appendSignal])

  useLayoutEffect(() => {
    if (preLoadHeightRef.current != null && containerRef.current) {
      const delta = containerRef.current.scrollHeight - preLoadHeightRef.current
      containerRef.current.scrollTop += delta
      preLoadHeightRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  useEffect(() => {
    if (!onLoadOlderRef.current || !hasMoreOlder) return
    const sentinel = topSentinelRef.current
    const container = containerRef.current
    if (!sentinel || !container) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMoreOlder && !isLoadingOlder) {
          if (containerRef.current) preLoadHeightRef.current = containerRef.current.scrollHeight
          onLoadOlderRef.current?.()
        }
      },
      { root: container, threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMoreOlder, isLoadingOlder])
}
