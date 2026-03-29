import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePresenceStore } from '../../store/presenceStore'
import { presenceApi } from '../../api/presence'

vi.mock('../../api/presence')

describe('presenceStore', () => {
  beforeEach(() => {
    usePresenceStore.setState({ onlineUsers: new Set() })
    vi.clearAllMocks()
  })

  describe('applyEvent', () => {
    it('adds user when online=true', () => {
      usePresenceStore.getState().applyEvent({ username: 'alice', online: true })
      expect(usePresenceStore.getState().isOnline('alice')).toBe(true)
    })

    it('removes user when online=false', () => {
      usePresenceStore.setState({ onlineUsers: new Set(['alice']) })
      usePresenceStore.getState().applyEvent({ username: 'alice', online: false })
      expect(usePresenceStore.getState().isOnline('alice')).toBe(false)
    })

    it('handles multiple users independently', () => {
      usePresenceStore.getState().applyEvent({ username: 'alice', online: true })
      usePresenceStore.getState().applyEvent({ username: 'bob', online: true })
      usePresenceStore.getState().applyEvent({ username: 'alice', online: false })
      expect(usePresenceStore.getState().isOnline('alice')).toBe(false)
      expect(usePresenceStore.getState().isOnline('bob')).toBe(true)
    })
  })

  describe('isOnline', () => {
    it('returns false for unknown user', () => {
      expect(usePresenceStore.getState().isOnline('nobody')).toBe(false)
    })

    it('returns true for online user', () => {
      usePresenceStore.setState({ onlineUsers: new Set(['charlie']) })
      expect(usePresenceStore.getState().isOnline('charlie')).toBe(true)
    })
  })

  describe('fetchOnlineUsers', () => {
    it('populates store from API', async () => {
      vi.mocked(presenceApi.getOnlineUsers).mockResolvedValue(['alice', 'bob'])
      await usePresenceStore.getState().fetchOnlineUsers()
      expect(usePresenceStore.getState().isOnline('alice')).toBe(true)
      expect(usePresenceStore.getState().isOnline('bob')).toBe(true)
    })
  })
})
