import client from './client'

export interface BrowserPushSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export const pushApi = {
  /** Fetch the server VAPID public key. Returns null when push is disabled (204). */
  getPublicKey: async (): Promise<string | null> => {
    const res = await client.get<{ publicKey: string }>('/push/public-key')
    return res.status === 204 ? null : (res.data?.publicKey ?? null)
  },

  subscribe: (subscription: BrowserPushSubscription) =>
    client.post('/push/subscribe', subscription).then((r) => r.data),

  unsubscribe: (endpoint: string) =>
    client.delete('/push/subscribe', { data: { endpoint } }).then((r) => r.data),
}
