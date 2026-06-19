import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import NotificationToaster from '../../components/ui/NotificationToaster'
import { useToastStore } from '../../store/toastStore'
import { useDMStore } from '../../store/dmStore'
import { useRoomStore } from '../../store/roomStore'

describe('NotificationToaster', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
    useDMStore.setState({ activeDMId: null })
    useRoomStore.setState({ activeRoomId: null })
  })

  it('renders nothing when there are no toasts', () => {
    const { container } = render(<NotificationToaster />)
    expect(container.firstChild).toBeNull()
  })

  it('shows a toast with title and body', () => {
    act(() => useToastStore.getState().showToast({ title: 'Alice', body: 'Hello there', avatarName: 'Alice', conversationId: 'c1' }))
    render(<NotificationToaster />)
    expect(screen.getByTestId('notification-toast')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Hello there')).toBeInTheDocument()
  })

  it('opens the DM conversation when clicked', () => {
    act(() => useToastStore.getState().showToast({ title: 'Alice', body: 'Hi', avatarName: 'Alice', conversationId: 'c1' }))
    render(<NotificationToaster />)
    fireEvent.click(screen.getByTestId('notification-toast-open'))
    expect(useDMStore.getState().activeDMId).toBe('c1')
  })

  it('opens the room when a room toast is clicked', () => {
    act(() => useToastStore.getState().showToast({ title: '#general', body: 'Hi', avatarName: 'bob', roomId: 'general' }))
    render(<NotificationToaster />)
    fireEvent.click(screen.getByTestId('notification-toast-open'))
    expect(useRoomStore.getState().activeRoomId).toBe('general')
  })

  it('dismisses the toast on close', () => {
    act(() => useToastStore.getState().showToast({ title: 'Alice', body: 'Hi', avatarName: 'Alice', roomId: 'r1' }))
    render(<NotificationToaster />)
    fireEvent.click(screen.getByTestId('notification-toast-dismiss'))
    expect(screen.queryByTestId('notification-toast')).not.toBeInTheDocument()
  })
})
