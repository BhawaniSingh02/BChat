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
    useDMStore.setState({
      conversations: [], messages: {}, activeDMId: null, isLoading: false, dmUnreadCounts: {}, requests: [],
      nextCursor: {}, hasMoreOlder: {}, isLoadingOlder: {},
    })
    vi.clearAllMocks()
  })

  describe('fetchConversations', () => {
    it('loads conversations from API', async () => {
      vi.mocked(dmApi.getConversations).mockResolvedValue([makeConv('conv-1')])
      await useDMStore.getState().fetchConversations()
      expect(useDMStore.getState().conversations).toHaveLength(1)
    })
  })

  describe('message requests', () => {
    it('fetchRequests loads pending requests', async () => {
      vi.mocked(dmApi.getRequests).mockResolvedValue([{ ...makeConv('r1'), status: 'PENDING', initiatedBy: 'bob' }])
      await useDMStore.getState().fetchRequests()
      expect(useDMStore.getState().requests).toHaveLength(1)
    })

    it('acceptRequest moves it from requests into conversations', async () => {
      useDMStore.setState({ requests: [{ ...makeConv('r1'), status: 'PENDING', initiatedBy: 'bob' }], conversations: [] })
      vi.mocked(dmApi.acceptRequest).mockResolvedValue({ ...makeConv('r1'), status: 'ACCEPTED' })

      await useDMStore.getState().acceptRequest('r1')

      expect(useDMStore.getState().requests).toHaveLength(0)
      expect(useDMStore.getState().conversations.find((c) => c.id === 'r1')?.status).toBe('ACCEPTED')
    })

    it('declineRequest removes it from requests', async () => {
      useDMStore.setState({ requests: [{ ...makeConv('r1'), status: 'PENDING', initiatedBy: 'bob' }] })
      vi.mocked(dmApi.declineRequest).mockResolvedValue(undefined)

      await useDMStore.getState().declineRequest('r1')

      expect(useDMStore.getState().requests).toHaveLength(0)
    })
  })

  describe('updateConversation', () => {
    it('replaces an existing conversation in place (e.g. after mute/archive)', () => {
      useDMStore.setState({ conversations: [makeConv('conv-1'), makeConv('conv-2')] })
      const updated: DirectConversation = { ...makeConv('conv-1'), archivedBy: ['alice'] }

      useDMStore.getState().updateConversation(updated)

      const stored = useDMStore.getState().conversations.find((c) => c.id === 'conv-1')
      expect(stored?.archivedBy).toEqual(['alice'])
      expect(useDMStore.getState().conversations).toHaveLength(2)
    })

    it('is a no-op when the conversation id is not present', () => {
      useDMStore.setState({ conversations: [makeConv('conv-1')] })
      useDMStore.getState().updateConversation({ ...makeConv('missing'), archivedBy: ['alice'] })
      expect(useDMStore.getState().conversations).toHaveLength(1)
      expect(useDMStore.getState().conversations[0].id).toBe('conv-1')
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

    it('denormalizes the last-message preview onto the conversation', () => {
      useDMStore.setState({ conversations: [makeConv('conv-1')] })
      const msg = { ...makeDMMessage('m1', 'conv-1', 'bob'), content: 'hey there' }
      useDMStore.getState().addMessage(msg)
      const conv = useDMStore.getState().conversations[0]
      expect(conv.lastMessagePreview).toBe('hey there')
      expect(conv.lastMessageType).toBe('TEXT')
      expect(conv.lastMessageSender).toBe('bob')
    })

    it('uses a media label preview for image messages', () => {
      useDMStore.setState({ conversations: [makeConv('conv-1')] })
      const msg = { ...makeDMMessage('m1', 'conv-1', 'bob'), content: '', messageType: 'IMAGE' as const }
      useDMStore.getState().addMessage(msg)
      expect(useDMStore.getState().conversations[0].lastMessagePreview).toBe('📷 Photo')
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
        nextCursor: 1000, hasMore: true,
      })
      await useDMStore.getState().fetchMessages('conv-1')
      const msgs = useDMStore.getState().messages['conv-1']
      expect(msgs).toHaveLength(3)
      expect(msgs[0].id).toBe('m1')
      expect(msgs[2].id).toBe('m3')
      expect(useDMStore.getState().nextCursor['conv-1']).toBe(1000)
      expect(useDMStore.getState().hasMoreOlder['conv-1']).toBe(true)
    })
  })

  describe('loadMoreMessages', () => {
    it('prepends older messages ahead of existing ones', async () => {
      useDMStore.setState({
        messages: { 'conv-1': [makeDMMessage('m3', 'conv-1')] },
        nextCursor: { 'conv-1': 3000 },
        hasMoreOlder: { 'conv-1': true },
      })
      vi.mocked(dmApi.getMessages).mockResolvedValue({
        content: [makeDMMessage('m2', 'conv-1'), makeDMMessage('m1', 'conv-1')],
        nextCursor: null, hasMore: false,
      })

      await useDMStore.getState().loadMoreMessages('conv-1')

      const msgs = useDMStore.getState().messages['conv-1']
      expect(msgs.map((m) => m.id)).toEqual(['m1', 'm2', 'm3'])
      expect(useDMStore.getState().nextCursor['conv-1']).toBeNull()
      expect(useDMStore.getState().hasMoreOlder['conv-1']).toBe(false)
      expect(dmApi.getMessages).toHaveBeenCalledWith('conv-1', 3000)
    })

    it('is a no-op when there is no cursor', async () => {
      useDMStore.setState({ nextCursor: { 'conv-1': null } })
      await useDMStore.getState().loadMoreMessages('conv-1')
      expect(dmApi.getMessages).not.toHaveBeenCalled()
    })

    it('is a no-op when already loading', async () => {
      useDMStore.setState({ nextCursor: { 'conv-1': 1000 }, isLoadingOlder: { 'conv-1': true } })
      await useDMStore.getState().loadMoreMessages('conv-1')
      expect(dmApi.getMessages).not.toHaveBeenCalled()
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
