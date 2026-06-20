import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const subscribeToPush = vi.fn().mockResolvedValue(undefined)
const unsubscribeFromPush = vi.fn().mockResolvedValue(undefined)
vi.mock('../../utils/push', () => ({
  subscribeToPush: () => subscribeToPush(),
  unsubscribeFromPush: () => unsubscribeFromPush(),
}))

import NotificationsPanel from '../../components/ui/settings/NotificationsPanel'

function setNotification(permission: NotificationPermission, requestResult: NotificationPermission) {
  ;(globalThis as unknown as { Notification: unknown }).Notification = {
    permission,
    requestPermission: vi.fn().mockResolvedValue(requestResult),
  }
}

describe('NotificationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    delete (globalThis as unknown as { Notification?: unknown }).Notification
  })

  it('enables notifications and subscribes to push when permission is granted', async () => {
    setNotification('default', 'granted')
    render(<NotificationsPanel />)
    fireEvent.click(screen.getByTestId('notifications-enable'))
    await waitFor(() => expect(subscribeToPush).toHaveBeenCalled())
    expect(await screen.findByTestId('notifications-note')).toHaveTextContent('enabled')
  })

  it('shows the off control when already granted and can disable', async () => {
    setNotification('granted', 'granted')
    render(<NotificationsPanel />)
    fireEvent.click(screen.getByTestId('notifications-disable'))
    await waitFor(() => expect(unsubscribeFromPush).toHaveBeenCalled())
  })

  it('shows a blocked message when permission is denied', () => {
    setNotification('denied', 'denied')
    render(<NotificationsPanel />)
    expect(screen.getByText('Notifications are blocked')).toBeInTheDocument()
  })
})
