import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../api/push', () => ({
  pushApi: {
    getPublicKey: vi.fn(),
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
  },
}))

import { pushApi } from '../../api/push'
import {
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
  initPushNavigationBridge,
} from '../../utils/push'

describe('push utils — unsupported environment (jsdom default)', () => {
  it('registerServiceWorker returns null', async () => {
    expect(await registerServiceWorker()).toBeNull()
  })
  it('subscribeToPush is a no-op (never asks the server for a key)', async () => {
    await subscribeToPush()
    expect(pushApi.getPublicKey).not.toHaveBeenCalled()
  })
})

describe('push utils — supported environment', () => {
  const subscription = {
    endpoint: 'https://push.example/abc',
    toJSON: () => ({ endpoint: 'https://push.example/abc', keys: { p256dh: 'p256', auth: 'authsecret' } }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  }
  const pushManager = {
    getSubscription: vi.fn().mockResolvedValue(null),
    subscribe: vi.fn().mockResolvedValue(subscription),
  }
  const registration = { pushManager }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let swMessageHandler: any

  beforeEach(() => {
    vi.clearAllMocks()
    pushManager.getSubscription.mockResolvedValue(null)
    pushManager.subscribe.mockResolvedValue(subscription)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).PushManager = function () {}
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: vi.fn().mockResolvedValue(registration),
        ready: Promise.resolve(registration),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        addEventListener: vi.fn((_t: string, h: any) => { swMessageHandler = h }),
        removeEventListener: vi.fn(),
      },
      configurable: true,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).Notification = { permission: 'granted' }
  })

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).serviceWorker
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).PushManager
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).Notification
  })

  it('subscribes and registers the subscription with the backend', async () => {
    vi.mocked(pushApi.getPublicKey).mockResolvedValue('BPublicKeyBase64Url')
    await subscribeToPush()
    expect(pushManager.subscribe).toHaveBeenCalled()
    expect(pushApi.subscribe).toHaveBeenCalledWith({
      endpoint: 'https://push.example/abc',
      keys: { p256dh: 'p256', auth: 'authsecret' },
    })
  })

  it('does nothing when the server has push disabled (no VAPID key)', async () => {
    vi.mocked(pushApi.getPublicKey).mockResolvedValue(null)
    await subscribeToPush()
    expect(pushManager.subscribe).not.toHaveBeenCalled()
    expect(pushApi.subscribe).not.toHaveBeenCalled()
  })

  it('reuses an existing subscription instead of creating a new one', async () => {
    pushManager.getSubscription.mockResolvedValue(subscription)
    vi.mocked(pushApi.getPublicKey).mockResolvedValue('BPublicKeyBase64Url')
    await subscribeToPush()
    expect(pushManager.subscribe).not.toHaveBeenCalled()
    expect(pushApi.subscribe).toHaveBeenCalled()
  })

  it('unsubscribes from the backend and the browser', async () => {
    pushManager.getSubscription.mockResolvedValue(subscription)
    await unsubscribeFromPush()
    expect(pushApi.unsubscribe).toHaveBeenCalledWith('https://push.example/abc')
    expect(subscription.unsubscribe).toHaveBeenCalled()
  })

  it('bridges service-worker messages to a notification:navigate event', () => {
    const cleanup = initPushNavigationBridge()
    const spy = vi.spyOn(window, 'dispatchEvent')
    swMessageHandler({ data: { type: 'notification-navigate', conversationId: 'c1' } })
    expect(spy).toHaveBeenCalled()
    const evt = spy.mock.calls[0][0] as CustomEvent
    expect(evt.type).toBe('notification:navigate')
    expect(evt.detail).toEqual({ conversationId: 'c1', roomId: undefined })
    cleanup()
  })
})
