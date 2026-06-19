import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useToastStore, TOAST_DURATION_MS } from '../../store/toastStore'

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
  })

  it('adds a toast with a generated id', () => {
    useToastStore.getState().showToast({ title: 'Alice', body: 'Hi', avatarName: 'Alice' })
    const { toasts } = useToastStore.getState()
    expect(toasts).toHaveLength(1)
    expect(toasts[0].id).toBeTruthy()
    expect(toasts[0].title).toBe('Alice')
  })

  it('keeps at most 3 toasts (newest first)', () => {
    for (let i = 0; i < 5; i++) {
      useToastStore.getState().showToast({ title: `T${i}`, body: 'b', avatarName: 'A' })
    }
    const { toasts } = useToastStore.getState()
    expect(toasts).toHaveLength(3)
    expect(toasts[0].title).toBe('T4')
  })

  it('dismisses a toast by id', () => {
    useToastStore.getState().showToast({ title: 'A', body: 'b', avatarName: 'A' })
    const id = useToastStore.getState().toasts[0].id
    useToastStore.getState().dismissToast(id)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('auto-dismisses after the display duration', () => {
    vi.useFakeTimers()
    useToastStore.getState().showToast({ title: 'A', body: 'b', avatarName: 'A' })
    expect(useToastStore.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(TOAST_DURATION_MS + 10)
    expect(useToastStore.getState().toasts).toHaveLength(0)
    vi.useRealTimers()
  })
})
