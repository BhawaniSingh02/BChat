import { describe, it, expect, beforeEach } from 'vitest'
import { useNotificationStore } from '../../store/notificationStore'
import type { Message } from '../../types'

const makeMsg = (id: string, content = 'hello'): Message => ({
  id,
  roomId: 'general',
  sender: 'alice',
  senderName: 'Alice',
  content,
  messageType: 'TEXT',
  readBy: [],
  timestamp: new Date().toISOString(),
})

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] })
  })

  it('starts with empty notifications', () => {
    const { notifications } = useNotificationStore.getState()
    expect(notifications).toEqual([])
  })

  it('addNotification adds a notification', () => {
    const { addNotification } = useNotificationStore.getState()
    addNotification(makeMsg('1'), '#general')
    const { notifications } = useNotificationStore.getState()
    expect(notifications).toHaveLength(1)
    expect(notifications[0].conversationLabel).toBe('#general')
    expect(notifications[0].read).toBe(false)
  })

  it('addNotification prepends new notifications (latest first)', () => {
    const { addNotification } = useNotificationStore.getState()
    addNotification(makeMsg('1', 'first'), '#general')
    addNotification(makeMsg('2', 'second'), '#general')
    const { notifications } = useNotificationStore.getState()
    expect(notifications[0].message.content).toBe('second')
    expect(notifications[1].message.content).toBe('first')
  })

  it('markAllRead marks all notifications as read', () => {
    const { addNotification, markAllRead } = useNotificationStore.getState()
    addNotification(makeMsg('1'), '#general')
    addNotification(makeMsg('2'), '#general')
    markAllRead()
    const { notifications } = useNotificationStore.getState()
    expect(notifications.every((n) => n.read)).toBe(true)
  })

  it('markRead marks a single notification as read', () => {
    const { addNotification, markRead } = useNotificationStore.getState()
    addNotification(makeMsg('1'), '#general')
    const id = useNotificationStore.getState().notifications[0].id
    markRead(id)
    const { notifications } = useNotificationStore.getState()
    expect(notifications[0].read).toBe(true)
  })

  it('unreadCount returns correct count', () => {
    const { addNotification } = useNotificationStore.getState()
    addNotification(makeMsg('1'), '#general')
    addNotification(makeMsg('2'), '#general')
    const { markRead, unreadCount } = useNotificationStore.getState()
    expect(unreadCount()).toBe(2)
    const firstId = useNotificationStore.getState().notifications[0].id
    markRead(firstId)
    expect(unreadCount()).toBe(1)
  })

  it('clearNotifications removes all', () => {
    const { addNotification, clearNotifications } = useNotificationStore.getState()
    addNotification(makeMsg('1'), '#general')
    clearNotifications()
    expect(useNotificationStore.getState().notifications).toHaveLength(0)
  })

  it('caps notifications at 50', () => {
    const { addNotification } = useNotificationStore.getState()
    for (let i = 0; i < 60; i++) {
      addNotification(makeMsg(String(i)), '#general')
    }
    expect(useNotificationStore.getState().notifications).toHaveLength(50)
  })
})
