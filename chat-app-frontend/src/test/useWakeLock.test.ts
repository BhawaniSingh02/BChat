import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { useWakeLock } from '../hooks/useWakeLock'

describe('useWakeLock', () => {
  const mockRelease = vi.fn().mockResolvedValue(undefined)
  const mockRequest = vi.fn().mockResolvedValue({ release: mockRelease })

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'wakeLock', {
      value: { request: mockRequest },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    // Restore original navigator.wakeLock
    Object.defineProperty(navigator, 'wakeLock', {
      value: undefined,
      writable: true,
      configurable: true,
    })
  })

  it('requests wake lock when active is true', async () => {
    renderHook(() => useWakeLock(true))
    // allow microtasks to flush
    await act(async () => {})
    expect(mockRequest).toHaveBeenCalledWith('screen')
  })

  it('does not request wake lock when active is false', async () => {
    renderHook(() => useWakeLock(false))
    await act(async () => {})
    expect(mockRequest).not.toHaveBeenCalled()
  })

  it('releases wake lock when active changes to false', async () => {
    const { rerender } = renderHook(({ active }) => useWakeLock(active), {
      initialProps: { active: true },
    })
    await act(async () => {})
    expect(mockRequest).toHaveBeenCalledOnce()

    rerender({ active: false })
    await act(async () => {})
    expect(mockRelease).toHaveBeenCalled()
  })

  it('silently ignores errors when wake lock is unsupported', async () => {
    Object.defineProperty(navigator, 'wakeLock', {
      value: undefined,
      writable: true,
      configurable: true,
    })
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow()
  })

  it('releases wake lock on unmount', async () => {
    const { unmount } = renderHook(() => useWakeLock(true))
    await act(async () => {})
    unmount()
    expect(mockRelease).toHaveBeenCalled()
  })
})
