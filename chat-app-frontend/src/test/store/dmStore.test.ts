import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useDMStore } from '../../store/dmStore'
import { dmApi } from '../../api/dm'
import type { DirectConversation, Message } from '../../types'

vi.mock('../../api/dm')

const makeConv = (id: string, participants = ['alice', 'bob']): DirectConversation => ({
  id,
  participants,
  createdAt: '2026-03-28T10:00:00',
})

const makeDMMessage = (id: string, convId: string, sender = 'alice'): Message => ({
  id,
  roomId: `dm:${convId}`,
  sender,
  senderName: sender,
  content: `Message ${id}`,
  messageType: 'TEXT',
  readBy: [],
  timestamp: '2026-03-28T10:00:00',
})

describe('dmStore', () => {
  beforeEach(() => {
    useDMStore.setState({ conversations: [], messages: {}, activeDMId: null, isLoading: false, dmUnreadCounts: {} })
    vi.clearAllMocks()
  })

  describe('fetchConversations', () => {
    it('loads conversations from API', async () => {
      vi.mocked(dmApi.getConversations).mockResolvedValue([makeConv('conv-1')])
      await useDMStore.getState().fetchConversations()
      expect(useDMStore.getState().conversations).toHaveLength(1)
    })
  })

  describe('getOrCreateConversation', () => {
    it('adds new conversation to list', async () => {
      const conv = makeConv('conv-new')
      vi.mocked(dmApi.getOrCreate).mockResolvedValue(conv)
      await useDMStore.getState().getOrCreateConversation('bob')
      expect(useDMStore.getState().conversations).toHaveLength(1)
    })

    it('does not duplicate existing conversation', async () => {
      const conv = makeConv('conv-1')
      useDMStore.setState({ conversations: [conv] })
      vi.mocked(dmApi.getOrCreate).mockResolvedValue(conv)
      await useDMStore.getState().getOrCreateConversation('bob')
      expect(useDMStore.getState().conversations).toHaveLength(1)
    })

    it('returns the conversation', async () => {
      const conv = makeConv('conv-1')
      vi.mocked(dmApi.getOrCreate).mockResolvedValue(conv)
      const result = await useDMStore.getState().getOrCreateConversation('bob')
      expect(result.id).toBe('conv-1')
    })
  })

  describe('addMessage', () => {
    it('adds DM message to correct conversation slot', () => {
      const msg = makeDMMessage('m1', 'conv-1')
      useDMStore.getState().addMessage(msg)
      expect(useDMStore.getState().messages['conv-1']).toHaveLength(1)
    })

    it('ignores non-DM messages', () => {
      const msg: Message = {
        id: 'm1', roomId: 'general', sender: 'alice', senderName: 'alice',
        content: 'hi', messageType: 'TEXT', readBy: [], timestamp: '2026-03-28T10:00:00',
      }
      useDMStore.getState().addMessage(msg)
      expect(Object.keys(useDMStore.getState().messages)).toHaveLength(0)
    })

    it('updates conversation lastMessageAt', () => {
      const conv = makeConv('conv-1')
      useDMStore.setState({ conversations: [conv] })
      const msg = makeDMMessage('m1', 'conv-1')
      useDMStore.getState().addMessage(msg)
      expect(useDMStore.getState().conversations[0].lastMessageAt).toBe(msg.timestamp)
    })
  })

  describe('setActiveDM', () => {
    it('sets active DM id', () => {
      useDMStore.getState().setActiveDM('conv-1')
      expect(useDMStore.getState().activeDMId).toBe('conv-1')
    })

    it('can clear active DM', () => {
      useDMStore.setState({ activeDMId: 'conv-1' })
      useDMStore.getState().setActiveDM(null)
      expect(useDMStore.getState().activeDMId).toBeNull()
    })
  })

  describe('fetchMessages', () => {
    it('fetches and reverses messages', async () => {
      vi.mocked(dmApi.getMessages).mockResolvedValue({
        content: [makeDMMessage('m3', 'conv-1'), makeDMMessage('m2', 'conv-1'), makeDMMessage('m1', 'conv-1')],
        totalElements: 3, totalPages: 1, number: 0, size: 50, last: true,
      })
      await useDMStore.getState().fetchMessages('conv-1')
      const msgs = useDMStore.getState().messages['conv-1']
      expect(msgs).toHaveLength(3)
      expect(msgs[0].id).toBe('m1')
      expect(msgs[2].id).toBe('m3')
    })
  })

  describe('incrementDMUnread', () => {
    it('increments unread count for a conversation', () => {
      useDMStore.getState().incrementDMUnread('conv-1')
      expect(useDMStore.getState().dmUnreadCounts['conv-1']).toBe(1)
    })

    it('increments multiple times', () => {
      useDMStore.getState().incrementDMUnread('conv-1')
      useDMStore.getState().incrementDMUnread('conv-1')
      expect(useDMStore.getState().dmUnreadCounts['conv-1']).toBe(2)
    })
  })

  describe('upsertDMMessage', () => {
    it('appends a new message when id does not exist', () => {
      const msg = makeDMMessage('m1', 'conv-1')
      useDMStore.getState().upsertDMMessage(msg)
      expect(useDMStore.getState().messages['conv-1']).toHaveLength(1)
      expect(useDMStore.getState().messages['conv-1'][0].id).toBe('m1')
    })

    it('replaces existing message when id matches (edit case)', () => {
      const original = makeDMMessage('m1', 'conv-1')
      useDMStore.setState({ messages: { 'conv-1': [original] } })
      const edited = { ...original, content: 'Edited content', edited: true }
      useDMStore.getState().upsertDMMessage(edited)
      const messages = useDMStore.getState().messages['conv-1']
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('Edited content')
      expect(messages[0].edited).toBe(true)
    })

    it('replaces existing message for soft delete case', () => {
      const original = makeDMMessage('m1', 'conv-1')
      useDMStore.setState({ messages: { 'conv-1': [original] } })
      const deleted = { ...original, content: '[This message was deleted]', deleted: true }
      useDMStore.getState().upsertDMMessage(deleted)
      const messages = useDMStore.getState().messages['conv-1']
      expect(messages).toHaveLength(1)
      expect(messages[0].deleted).toBe(true)
    })

    it('ignores non-DM messages', () => {
      const msg: Message = {
        id: 'm1', roomId: 'general', sender: 'alice', senderName: 'alice',
        content: 'hi', messageType: 'TEXT', readBy: [], timestamp: '2026-03-28T10:00:00',
      }
      useDMStore.getState().upsertDMMessage(msg)
      expect(Object.keys(useDMStore.getState().messages)).toHaveLength(0)
    })

    it('preserves order when replacing middle message', () => {
      const m1 = makeDMMessage('m1', 'conv-1')
      const m2 = makeDMMessage('m2', 'conv-1')
      const m3 = makeDMMessage('m3', 'conv-1')
      useDMStore.setState({ messages: { 'conv-1': [m1, m2, m3] } })
      const editedM2 = { ...m2, content: 'Updated' }
      useDMStore.getState().upsertDMMessage(editedM2)
      const msgs = useDMStore.getState().messages['conv-1']
      expect(msgs).toHaveLength(3)
      expect(msgs[0].id).toBe('m1')
      expect(msgs[1].content).toBe('Updated')
      expect(msgs[2].id).toBe('m3')
    })
  })

  describe('resetDMUnread', () => {
    it('removes the unread count entry', () => {
      useDMStore.setState({ dmUnreadCounts: { 'conv-1': 3 } })
      useDMStore.getState().resetDMUnread('conv-1')
      expect(useDMStore.getState().dmUnreadCounts['conv-1']).toBeUndefined()
    })

    it('is a no-op when count is already zero', () => {
      useDMStore.getState().resetDMUnread('conv-99')
      expect(useDMStore.getState().dmUnreadCounts['conv-99']).toBeUndefined()
    })
  })
})
