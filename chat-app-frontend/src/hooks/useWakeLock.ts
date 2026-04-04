import { useEffect, useRef } from 'react'

/**
 * useWakeLock — prevent the device screen from sleeping during a call.
 *
 * Acquires a Wake Lock Screen sentinel when `active` is true, releases it
 * when `active` becomes false or the component unmounts.
 *
 * The Wake Lock API is available in Chrome/Edge 84+ and Safari 16.4+.
 * On unsupported browsers or in non-secure contexts the call silently no-ops.
 */
export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!active) {
      sentinelRef.current?.release().catch(() => {})
      sentinelRef.current = null
      return
    }

    let cancelled = false

    const acquire = async () => {
      try {
        if ('wakeLock' in navigator && navigator.wakeLock) {
          const sentinel = await navigator.wakeLock.request('screen')
          if (!cancelled) {
            sentinelRef.current = sentinel
          } else {
            sentinel.release().catch(() => {})
          }
        }
      } catch {
        // NotAllowedError on hidden tabs or insecure contexts — ignore
      }
    }

    acquire()

    // Re-acquire after visibility change (browser releases lock on tab hide)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && active) {
        acquire()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibility)
      sentinelRef.current?.release().catch(() => {})
      sentinelRef.current = null
    }
  }, [active])
}
