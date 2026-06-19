import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ensureNotificationPermission, showBrowserNotification } from '../../utils/browserNotify'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setNotification(impl: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).Notification = impl
}

describe('browserNotify', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('requests permission when it has not been decided', () => {
    const requestPermission = vi.fn().mockResolvedValue('granted')
    setNotification(Object.assign(vi.fn(), { permission: 'default', requestPermission }))
    ensureNotificationPermission()
    expect(requestPermission).toHaveBeenCalled()
  })

  it('does not re-request when already granted', () => {
    const requestPermission = vi.fn()
    setNotification(Object.assign(vi.fn(), { permission: 'granted', requestPermission }))
    ensureNotificationPermission()
    expect(requestPermission).not.toHaveBeenCalled()
  })

  it('does not show a notification without permission', () => {
    const ctor = vi.fn()
    setNotification(Object.assign(ctor, { permission: 'denied' }))
    showBrowserNotification('Alice', 'Hi', { conversationId: 'c1' })
    expect(ctor).not.toHaveBeenCalled()
  })

  it('shows a notification and dispatches a navigate event on click', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let instance: any
    const ctor = vi.fn(function (this: Record<string, unknown>, title: string) {
      instance = this
      this.title = title
      this.close = vi.fn()
    })
    setNotification(Object.assign(ctor, { permission: 'granted' }))
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    showBrowserNotification('Alice', 'Hi', { conversationId: 'c1' })
    expect(ctor).toHaveBeenCalledWith('Alice', expect.objectContaining({ body: 'Hi', tag: 'c1' }))

    instance.onclick()
    expect(dispatchSpy).toHaveBeenCalled()
    const event = dispatchSpy.mock.calls[0][0] as CustomEvent
    expect(event.type).toBe('notification:navigate')
    expect(event.detail).toEqual({ conversationId: 'c1' })
  })
})
