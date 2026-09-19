import { describe, it, expect } from 'vitest'
import { buildRenderUnits, lastMessageOfUnit } from '../../components/chat/messageListShared'
import type { Message } from '../../types'

const BASE_TIME = new Date('2026-03-28T10:00:00Z').getTime()

function makeImage(id: string, overrides: Partial<Message> = {}): Message {
  return {
    id,
    roomId: 'general',
    sender: 'alice',
    senderName: 'alice',
    // Empty content is the exact "no caption" signal MessageInput sends for images
    // (handleFileUploadComplete) — no real caption, by default.
    content: '',
    messageType: 'IMAGE',
    fileUrl: `https://res.cloudinary.com/demo/image/upload/photo${id}.jpg`,
    readBy: [],
    timestamp: new Date(BASE_TIME).toISOString(),
    ...overrides,
  }
}

function makeText(id: string, overrides: Partial<Message> = {}): Message {
  return {
    id,
    roomId: 'general',
    sender: 'alice',
    senderName: 'alice',
    content: `text ${id}`,
    messageType: 'TEXT',
    readBy: [],
    timestamp: new Date(BASE_TIME).toISOString(),
    ...overrides,
  }
}

function atOffsetMinutes(minutes: number): string {
  return new Date(BASE_TIME + minutes * 60_000).toISOString()
}

describe('buildRenderUnits', () => {
  it('groups two or more consecutive same-sender images within the window into one imageGroup unit', () => {
    const messages = [
      makeImage('1', { timestamp: atOffsetMinutes(0) }),
      makeImage('2', { timestamp: atOffsetMinutes(1) }),
      makeImage('3', { timestamp: atOffsetMinutes(2) }),
    ]
    const units = buildRenderUnits(messages)
    expect(units).toHaveLength(1)
    expect(units[0]).toMatchObject({ type: 'imageGroup' })
    expect(units[0].type === 'imageGroup' && units[0].messages.map((m) => m.id)).toEqual(['1', '2', '3'])
  })

  it('does not group a single lone image — stays a single unit', () => {
    const messages = [makeImage('1')]
    const units = buildRenderUnits(messages)
    expect(units).toEqual([{ type: 'single', message: messages[0] }])
  })

  it('breaks the group when a different sender sends an image in between', () => {
    const messages = [
      makeImage('1', { sender: 'alice', timestamp: atOffsetMinutes(0) }),
      makeImage('2', { sender: 'bob', timestamp: atOffsetMinutes(1) }),
      makeImage('3', { sender: 'alice', timestamp: atOffsetMinutes(2) }),
    ]
    const units = buildRenderUnits(messages)
    expect(units).toEqual([
      { type: 'single', message: messages[0] },
      { type: 'single', message: messages[1] },
      { type: 'single', message: messages[2] },
    ])
  })

  it('breaks the group when images are more than 5 minutes apart', () => {
    const messages = [
      makeImage('1', { timestamp: atOffsetMinutes(0) }),
      makeImage('2', { timestamp: atOffsetMinutes(10) }),
    ]
    const units = buildRenderUnits(messages)
    expect(units).toEqual([
      { type: 'single', message: messages[0] },
      { type: 'single', message: messages[1] },
    ])
  })

  it('breaks the group across a day boundary', () => {
    // No 'Z' suffix — parsed as local wall-clock time, so this is guaranteed to straddle a
    // local calendar-day boundary regardless of the test runner's timezone (unlike a fixed
    // UTC instant, which lands on a different local date depending on the runner's offset).
    const messages = [
      makeImage('1', { timestamp: '2026-03-28T23:58:00' }),
      makeImage('2', { timestamp: '2026-03-29T00:01:00' }),
    ]
    const units = buildRenderUnits(messages)
    expect(units).toEqual([
      { type: 'single', message: messages[0] },
      { type: 'single', message: messages[1] },
    ])
  })

  it('breaks the group at an image with a real caption', () => {
    const messages = [
      makeImage('1', { timestamp: atOffsetMinutes(0) }),
      makeImage('2', { timestamp: atOffsetMinutes(1), content: 'look at this!' }),
      makeImage('3', { timestamp: atOffsetMinutes(2) }),
    ]
    const units = buildRenderUnits(messages)
    // image 2 (captioned) is excluded from grouping entirely and rendered as its own single unit;
    // images 1 and 3 are no longer adjacent to each other so they each stay single too
    expect(units).toEqual([
      { type: 'single', message: messages[0] },
      { type: 'single', message: messages[1] },
      { type: 'single', message: messages[2] },
    ])
  })

  it('breaks the group at a reply or forwarded image', () => {
    const messages = [
      makeImage('1', { timestamp: atOffsetMinutes(0) }),
      makeImage('2', { timestamp: atOffsetMinutes(1), replyToId: 'root-1' }),
      makeImage('3', { timestamp: atOffsetMinutes(2) }),
      makeImage('4', { timestamp: atOffsetMinutes(3), forwardedFrom: 'carol' }),
      makeImage('5', { timestamp: atOffsetMinutes(4) }),
    ]
    const units = buildRenderUnits(messages)
    expect(units.map((u) => u.type)).toEqual(['single', 'single', 'single', 'single', 'single'])
  })

  it('breaks the group when a non-image message interrupts a run', () => {
    const messages = [
      makeImage('1', { timestamp: atOffsetMinutes(0) }),
      makeText('t1', { timestamp: atOffsetMinutes(1) }),
      makeImage('2', { timestamp: atOffsetMinutes(2) }),
    ]
    const units = buildRenderUnits(messages)
    expect(units).toEqual([
      { type: 'single', message: messages[0] },
      { type: 'single', message: messages[1] },
      { type: 'single', message: messages[2] },
    ])
  })

  it('does not group images from an untrusted URL', () => {
    const messages = [
      makeImage('1', { timestamp: atOffsetMinutes(0), fileUrl: 'https://evil.com/a.jpg' }),
      makeImage('2', { timestamp: atOffsetMinutes(1), fileUrl: 'https://evil.com/b.jpg' }),
    ]
    const units = buildRenderUnits(messages)
    expect(units.every((u) => u.type === 'single')).toBe(true)
  })

  it('groups uncaptioned images whose Cloudinary URL filename diverges from the original name (unique_filename:true), regression for the caption heuristic bug', () => {
    // Cloudinary uploads with unique_filename:true, so the stored public_id almost never
    // matches the original filename — e.g. "vacation.jpg" becomes "vacation_a1b2c3xyz.jpg".
    // Grouping must not depend on that filename matching content in any way; content being
    // empty is the only signal that matters.
    const messages = [
      makeImage('1', { timestamp: atOffsetMinutes(0), content: '', fileUrl: 'https://res.cloudinary.com/demo/image/upload/vacation_a1b2c3xyz.jpg' }),
      makeImage('2', { timestamp: atOffsetMinutes(1), content: '', fileUrl: 'https://res.cloudinary.com/demo/image/upload/sunset_9f8e7d6c.jpg' }),
      makeImage('3', { timestamp: atOffsetMinutes(2), content: '', fileUrl: 'https://res.cloudinary.com/demo/image/upload/beach_q1w2e3r4.jpg' }),
    ]
    const units = buildRenderUnits(messages)
    expect(units).toHaveLength(1)
    expect(units[0]).toMatchObject({ type: 'imageGroup' })
    expect(units[0].type === 'imageGroup' && units[0].messages).toHaveLength(3)
  })

  it('keeps text messages before and after a group as separate single units', () => {
    const messages = [
      makeText('t1', { timestamp: atOffsetMinutes(0) }),
      makeImage('1', { timestamp: atOffsetMinutes(1) }),
      makeImage('2', { timestamp: atOffsetMinutes(2) }),
      makeText('t2', { timestamp: atOffsetMinutes(3) }),
    ]
    const units = buildRenderUnits(messages)
    expect(units.map((u) => u.type)).toEqual(['single', 'imageGroup', 'single'])
  })
})

describe('lastMessageOfUnit', () => {
  it('returns the message itself for a single unit', () => {
    const message = makeText('1')
    expect(lastMessageOfUnit({ type: 'single', message })).toBe(message)
  })

  it('returns the last (most recent) message for an imageGroup unit', () => {
    const messages = [makeImage('1'), makeImage('2'), makeImage('3')]
    expect(lastMessageOfUnit({ type: 'imageGroup', messages })).toBe(messages[2])
  })
})
