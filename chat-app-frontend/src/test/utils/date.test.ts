import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatTime, formatDate, formatRelative, isSameDay } from '../../utils/date'

describe('formatTime', () => {
  it('formats timestamp to HH:MM', () => {
    const result = formatTime('2026-03-28T14:30:00')
    expect(result).toMatch(/\d{1,2}:\d{2}/)
  })
})

describe('formatDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-28T12:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('returns Today for current date', () => {
    expect(formatDate('2026-03-28T10:00:00')).toBe('Today')
  })

  it('returns Yesterday for previous day', () => {
    expect(formatDate('2026-03-27T10:00:00')).toBe('Yesterday')
  })

  it('returns weekday name for dates within 7 days', () => {
    const result = formatDate('2026-03-22T10:00:00') // 6 days ago
    expect(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']).toContain(result)
  })
})

describe('formatRelative', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-28T12:00:00'))
  })
  afterEach(() => vi.useRealTimers())

  it('returns just now for very recent timestamps', () => {
    expect(formatRelative('2026-03-28T11:59:59')).toBe('just now')
  })

  it('returns Xm ago for minutes', () => {
    expect(formatRelative('2026-03-28T11:45:00')).toBe('15m ago')
  })

  it('returns formatted time for within 24h', () => {
    const result = formatRelative('2026-03-28T08:00:00')
    expect(result).toMatch(/\d{1,2}:\d{2}/)
  })
})

describe('isSameDay', () => {
  it('returns true for same day timestamps', () => {
    expect(isSameDay('2026-03-28T08:00:00', '2026-03-28T22:00:00')).toBe(true)
  })

  it('returns false for different day timestamps', () => {
    expect(isSameDay('2026-03-28T23:59:00', '2026-03-29T00:01:00')).toBe(false)
  })

  it('returns false for different months', () => {
    expect(isSameDay('2026-02-28T10:00:00', '2026-03-28T10:00:00')).toBe(false)
  })
})
