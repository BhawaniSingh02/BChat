import { describe, it, expect } from 'vitest'
import { isConversationMuted, isConversationArchived } from '../../utils/conversation'
import type { DirectConversation } from '../../types'

const base = (over: Partial<DirectConversation>): DirectConversation => ({
  id: 'c1',
  participants: ['alice', 'bob'],
  createdAt: '2026-01-01T00:00:00',
  ...over,
})

describe('isConversationMuted', () => {
  it('returns true when mutedBy holds a future timestamp for the user', () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    expect(isConversationMuted(base({ mutedBy: { alice: future } }), 'alice')).toBe(true)
  })

  it('returns false when the mute timestamp is in the past', () => {
    const past = new Date(Date.now() - 60_000).toISOString()
    expect(isConversationMuted(base({ mutedBy: { alice: past } }), 'alice')).toBe(false)
  })

  it('returns false when the user is not muted', () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    expect(isConversationMuted(base({ mutedBy: { bob: future } }), 'alice')).toBe(false)
  })

  it('returns false for missing conversation or username', () => {
    expect(isConversationMuted(undefined, 'alice')).toBe(false)
    expect(isConversationMuted(base({ mutedBy: {} }), null)).toBe(false)
  })
})

describe('isConversationArchived', () => {
  it('returns true when archivedBy includes the user', () => {
    expect(isConversationArchived(base({ archivedBy: ['alice'] }), 'alice')).toBe(true)
  })

  it('returns false when the user has not archived it', () => {
    expect(isConversationArchived(base({ archivedBy: ['bob'] }), 'alice')).toBe(false)
    expect(isConversationArchived(base({ archivedBy: [] }), 'alice')).toBe(false)
    expect(isConversationArchived(base({}), 'alice')).toBe(false)
  })

  it('returns false for missing conversation or username', () => {
    expect(isConversationArchived(undefined, 'alice')).toBe(false)
    expect(isConversationArchived(base({ archivedBy: ['alice'] }), null)).toBe(false)
  })
})
