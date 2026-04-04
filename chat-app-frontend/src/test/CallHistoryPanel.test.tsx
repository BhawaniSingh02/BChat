import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CallHistoryPanel from '../components/call/CallHistoryPanel'
import type { CallSession } from '../types'

const makeSession = (overrides: Partial<CallSession> = {}): CallSession => ({
  id: 'sess-1',
  conversationId: 'conv-1',
  callerId: 'alice',
  calleeId: 'bob',
  callType: 'AUDIO',
  status: 'ENDED',
  startedAt: new Date('2026-01-01T10:00:00Z').toISOString(),
  durationSeconds: 60,
  ...overrides,
})

describe('CallHistoryPanel', () => {
  it('renders with no sessions showing empty state', () => {
    render(<CallHistoryPanel sessions={[]} currentUsername="alice" onClose={vi.fn()} />)
    expect(screen.getByText(/no call history yet/i)).toBeInTheDocument()
  })

  it('renders a list of sessions', () => {
    const sessions = [
      makeSession({ id: 's1', status: 'ENDED', callType: 'AUDIO' }),
      makeSession({ id: 's2', status: 'MISSED', callType: 'VIDEO' }),
    ]
    render(<CallHistoryPanel sessions={sessions} currentUsername="alice" onClose={vi.fn()} />)
    expect(screen.getByTestId('call-history-item-s1')).toBeInTheDocument()
    expect(screen.getByTestId('call-history-item-s2')).toBeInTheDocument()
  })

  it('shows duration for ended calls', () => {
    render(<CallHistoryPanel sessions={[makeSession({ durationSeconds: 90 })]} currentUsername="alice" onClose={vi.fn()} />)
    expect(screen.getByText(/1m 30s/)).toBeInTheDocument()
  })

  it('shows status label for each session', () => {
    render(
      <CallHistoryPanel
        sessions={[makeSession({ status: 'MISSED' }), makeSession({ id: 's2', status: 'REJECTED' })]}
        currentUsername="alice"
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('missed')).toBeInTheDocument()
    expect(screen.getByText('rejected')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<CallHistoryPanel sessions={[]} currentUsername="alice" onClose={onClose} />)
    fireEvent.click(screen.getByTestId('close-history-btn'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows panel testid', () => {
    render(<CallHistoryPanel sessions={[]} currentUsername="alice" onClose={vi.fn()} />)
    expect(screen.getByTestId('call-history-panel')).toBeInTheDocument()
  })

  it('shows outgoing for sessions where currentUser is caller', () => {
    render(
      <CallHistoryPanel
        sessions={[makeSession({ callerId: 'alice', calleeId: 'bob' })]}
        currentUsername="alice"
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText(/outgoing audio/i)).toBeInTheDocument()
  })

  it('shows incoming for sessions where currentUser is callee', () => {
    render(
      <CallHistoryPanel
        sessions={[makeSession({ callerId: 'bob', calleeId: 'alice' })]}
        currentUsername="alice"
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText(/incoming audio/i)).toBeInTheDocument()
  })

  it('does not show duration when durationSeconds is 0', () => {
    render(
      <CallHistoryPanel
        sessions={[makeSession({ durationSeconds: 0, status: 'MISSED' })]}
        currentUsername="alice"
        onClose={vi.fn()}
      />
    )
    // Duration should not appear
    expect(screen.queryByText(/0m 0s|0s/)).not.toBeInTheDocument()
  })
})
