import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useChatStore } from '../../store/chatStore'
import type { Message } from '../../types'
import { roomsApi } from '../../api/rooms'

vi.mock('../../api/rooms')

const makeMessage = (id: string, roomId = 'general', sender = 'alice'): Message => ({
  id,
  roomId,
  sender,
  senderName: sender,
  content: `Message ${id}`,
  messageType: 'TEXT',
  readBy: [],
  timestamp: `2026-03-28T10:0${id}:00`,
})

describe('chatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      messages: {},
      typingUsers: {},
      isLoadingMessages: false,
      unreadCounts: {},
      nextCursor: {},
      hasMoreOlder: {},
      isLoadingOlder: {},
    })
    vi.clearAllMocks()
  })

  describe('addMessage', () => {
    it('adds message to room messages', () => {
      const msg = makeMessage('1')
      useChatStore.getState().addMessage(msg)
      expect(useChatStore.getState().messages['general']).toHaveLength(1)
      expect(useChatStore.getState().messages['general'][0]).toEqual(msg)
    })

    it('appends to existing room messages', () => {
      const msg1 = makeMessage('1')
      const msg2 = makeMessage('2')
      useChatStore.getState().addMessage(msg1)
      useChatStore.getState().addMessage(msg2)
      expect(useChatStore.getState().messages['general']).toHaveLength(2)
    })

    it('handles multiple rooms independently', () => {
      useChatStore.getState().addMessage(makeMessage('1', 'room-a'))
      useChatStore.getState().addMessage(makeMessage('2', 'room-b'))
      expect(useChatStore.getState().messages['room-a']).toHaveLength(1)
      expect(useChatStore.getState().messages['room-b']).toHaveLength(1)
    })
  })

  describe('setTyping', () => {
    it('adds username to typing list', () => {
      useChatStore.getState().setTyping('general', 'bob', true)
      expect(useChatStore.getState().typingUsers['general']).toContain('bob')
    })

    it('removes username when typing=false', () => {
      useChatStore.setState({ typingUsers: { general: ['bob'] } })
      useChatStore.getState().setTyping('general', 'bob', false)
      expect(useChatStore.getState().typingUsers['general']).not.toContain('bob')
    })

    it('does not duplicate typing users', () => {
      useChatStore.getState().setTyping('general', 'bob', true)
      useChatStore.getState().setTyping('general', 'bob', true)
      expect(useChatStore.getState().typingUsers['general'].filter((u) => u === 'bob')).toHaveLength(1)
    })
  })

  describe('updateReadBy', () => {
    it('updates message readBy in store', () => {
      const msg = makeMessage('1')
      useChatStore.getState().addMessage(msg)

      const updated = { ...msg, readBy: ['alice', 'bob'] }
      useChatStore.getState().updateReadBy(updated)

      const stored = useChatStore.getState().messages['general'][0]
      expect(stored.readBy).toContain('bob')
    })
  })

  describe('clearRoom', () => {
    it('removes room messages', () => {
      useChatStore.getState().addMessage(makeMessage('1'))
      useChatStore.getState().clearRoom('general')
      expect(useChatStore.getState().messages['general']).toBeUndefined()
    })

    it('does not affect other rooms', () => {
      useChatStore.getState().addMessage(makeMessage('1', 'general'))
      useChatStore.getState().addMessage(makeMessage('2', 'other'))
      useChatStore.getState().clearRoom('general')
      expect(useChatStore.getState().messages['other']).toHaveLength(1)
    })
  })

  describe('upsertMessage', () => {
    it('appends message when ID does not exist', () => {
      useChatStore.getState().addMessage(makeMessage('1'))
      useChatStore.getState().upsertMessage(makeMessage('2'))
      expect(useChatStore.getState().messages['general']).toHaveLength(2)
    })

    it('replaces existing message when ID matches (edit case)', () => {
      const original = makeMessage('1')
      useChatStore.getState().addMessage(original)
      const edited = { ...original, content: 'edited content', edited: true }
      useChatStore.getState().upsertMessage(edited)
      const stored = useChatStore.getState().messages['general']
      expect(stored).toHaveLength(1)
      expect(stored[0].content).toBe('edited content')
      expect(stored[0].edited).toBe(true)
    })

    it('replaces existing message for soft delete case', () => {
      const original = makeMessage('1')
      useChatStore.getState().addMessage(original)
      const deleted = { ...original, content: '[This message was deleted]', deleted: true }
      useChatStore.getState().upsertMessage(deleted)
      const stored = useChatStore.getState().messages['general']
      expect(stored).toHaveLength(1)
      expect(stored[0].deleted).toBe(true)
    })

    it('preserves order when replacing in middle', () => {
      useChatStore.getState().addMessage(makeMessage('1'))
      useChatStore.getState().addMessage(makeMessage('2'))
      useChatStore.getState().addMessage(makeMessage('3'))
      const edited = { ...makeMessage('2'), content: 'edited' }
      useChatStore.getState().upsertMessage(edited)
      const stored = useChatStore.getState().messages['general']
      expect(stored.map((m) => m.id)).toEqual(['1', '2', '3'])
      expect(stored[1].content).toBe('edited')
    })
  })

  describe('unread counts', () => {
    it('increments unread count for a room', () => {
      const store = useChatStore.getState()
      store.incrementUnread('general')
      store.incrementUnread('general')
      expect(useChatStore.getState().unreadCounts['general']).toBe(2)
    })

    it('resets unread count for a room', () => {
      const store = useChatStore.getState()
      store.incrementUnread('general')
      store.resetUnread('general')
      expect(useChatStore.getState().unreadCounts['general']).toBeUndefined()
    })

    it('does not include key after reset', () => {
      const store = useChatStore.getState()
      store.incrementUnread('room1')
      store.resetUnread('room1')
      expect('room1' in useChatStore.getState().unreadCounts).toBe(false)
    })

    it('resetUnread is a no-op when count is already zero', () => {
      const initial = useChatStore.getState().unreadCounts
      useChatStore.getState().resetUnread('nonexistent')
      expect(useChatStore.getState().unreadCounts).toBe(initial)
    })
  })

  describe('fetchMessages', () => {
    it('fetches and reverses messages for display', async () => {
      vi.mocked(roomsApi.getMessages).mockResolvedValue({
        content: [makeMessage('3'), makeMessage('2'), makeMessage('1')], // newest first
        nextCursor: 1000,
        hasMore: true,
      })

      await useChatStore.getState().fetchMessages('general')

      const messages = useChatStore.getState().messages['general']
      expect(messages).toHaveLength(3)
      // Should be reversed: oldest first
      expect(messages[0].id).toBe('1')
      expect(messages[2].id).toBe('3')
      expect(useChatStore.getState().nextCursor['general']).toBe(1000)
      expect(useChatStore.getState().hasMoreOlder['general']).toBe(true)
    })
  })

  describe('loadMoreMessages', () => {
    it('prepends older messages ahead of existing ones', async () => {
      useChatStore.setState({
        messages: { general: [makeMessage('3')] },
        nextCursor: { general: 3000 },
        hasMoreOlder: { general: true },
      })
      vi.mocked(roomsApi.getMessages).mockResolvedValue({
        content: [makeMessage('2'), makeMessage('1')], // newest first
        nextCursor: null,
        hasMore: false,
      })

      await useChatStore.getState().loadMoreMessages('general')

      const messages = useChatStore.getState().messages['general']
      expect(messages.map((m) => m.id)).toEqual(['1', '2', '3'])
      expect(useChatStore.getState().nextCursor['general']).toBeNull()
      expect(useChatStore.getState().hasMoreOlder['general']).toBe(false)
      expect(roomsApi.getMessages).toHaveBeenCalledWith('general', 3000)
    })

    it('is a no-op when there is no cursor', async () => {
      useChatStore.setState({ nextCursor: { general: null } })
      await useChatStore.getState().loadMoreMessages('general')
      expect(roomsApi.getMessages).not.toHaveBeenCalled()
    })

    it('is a no-op when already loading', async () => {
      useChatStore.setState({ nextCursor: { general: 1000 }, isLoadingOlder: { general: true } })
      await useChatStore.getState().loadMoreMessages('general')
      expect(roomsApi.getMessages).not.toHaveBeenCalled()
    })
  })
})
