import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../hooks/useCallAudio', () => ({ playMessageChime: vi.fn() }))
vi.mock('../../utils/browserNotify', () => ({ showBrowserNotification: vi.fn() }))

import { presentIncomingNotification, messagePreview } from '../../utils/notify'
import { playMessageChime } from '../../hooks/useCallAudio'
import { showBrowserNotification } from '../../utils/browserNotify'
import { useToastStore } from '../../store/toastStore'

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { value: hidden, configurable: true })
}

describe('messagePreview', () => {
  it('returns the content when present', () => {
    expect(messagePreview('hello', 'TEXT')).toBe('hello')
  })
  it('maps empty media messages to a label', () => {
    expect(messagePreview('', 'IMAGE')).toBe('📷 Photo')
    expect(messagePreview('', 'FILE')).toBe('📎 File')
    expect(messagePreview('', 'AUDIO')).toBe('🎤 Voice message')
    expect(messagePreview('', 'VIDEO')).toBe('🎬 Video')
    expect(messagePreview(undefined, undefined)).toBe('New message')
  })
})

describe('presentIncomingNotification', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
    vi.clearAllMocks()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).electronAPI
  })

  it('foreground → shows an in-app toast and plays the chime', () => {
    setHidden(false)
    presentIncomingNotification({ title: 'Alice', body: 'Hi', avatarName: 'Alice', conversationId: 'c1' })
    expect(useToastStore.getState().toasts).toHaveLength(1)
    expect(playMessageChime).toHaveBeenCalledTimes(1)
    expect(showBrowserNotification).not.toHaveBeenCalled()
  })

  it('backgrounded (web) → shows a browser notification, no toast or chime', () => {
    setHidden(true)
    presentIncomingNotification({ title: 'Alice', body: 'Hi', avatarName: 'Alice', conversationId: 'c1' })
    expect(useToastStore.getState().toasts).toHaveLength(0)
    expect(playMessageChime).not.toHaveBeenCalled()
    expect(showBrowserNotification).toHaveBeenCalledWith('Alice', 'Hi', { conversationId: 'c1', roomId: undefined })
    setHidden(false)
  })
})
