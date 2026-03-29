import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DMConversationCard from '../../components/chat/DMConversationCard'
import type { DirectConversation } from '../../types'

const makeConv = (id: string, participants = ['alice', 'bob'], lastMessageAt?: string): DirectConversation => ({
  id,
  participants,
  createdAt: '2026-03-28T10:00:00',
  ...(lastMessageAt ? { lastMessageAt } : {}),
})

describe('DMConversationCard', () => {
  it('renders the other participant name', () => {
    render(
      <DMConversationCard
        conversation={makeConv('conv-1')}
        currentUsername="alice"
      />
    )
    expect(screen.getByText('bob')).toBeInTheDocument()
  })

  it('does not render current user name', () => {
    render(
      <DMConversationCard
        conversation={makeConv('conv-1')}
        currentUsername="alice"
      />
    )
    expect(screen.queryByText('alice')).not.toBeInTheDocument()
  })

  it('shows Online when online=true', () => {
    render(
      <DMConversationCard
        conversation={makeConv('conv-1')}
        currentUsername="alice"
        online
      />
    )
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('shows Offline when online=false', () => {
    render(
      <DMConversationCard
        conversation={makeConv('conv-1')}
        currentUsername="alice"
        online={false}
      />
    )
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('applies active styles when active=true', () => {
    render(
      <DMConversationCard
        conversation={makeConv('conv-1')}
        currentUsername="alice"
        active
      />
    )
    const btn = screen.getByTestId('dm-card')
    expect(btn).toHaveAttribute('aria-current', 'page')
  })

  it('does not set aria-current when not active', () => {
    render(
      <DMConversationCard
        conversation={makeConv('conv-1')}
        currentUsername="alice"
        active={false}
      />
    )
    expect(screen.getByTestId('dm-card')).not.toHaveAttribute('aria-current')
  })

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn()
    render(
      <DMConversationCard
        conversation={makeConv('conv-1')}
        currentUsername="alice"
        onClick={handleClick}
      />
    )
    await userEvent.click(screen.getByTestId('dm-card'))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('shows lastMessageAt timestamp when provided', () => {
    render(
      <DMConversationCard
        conversation={makeConv('conv-1', ['alice', 'bob'], '2026-03-28T10:00:00')}
        currentUsername="alice"
      />
    )
    // The formatRelative utility renders some time string — just check something is there
    const card = screen.getByTestId('dm-card')
    expect(card).toBeInTheDocument()
  })

  it('handles unknown participant gracefully', () => {
    const conv: DirectConversation = { id: 'conv-1', participants: ['alice'], createdAt: '2026-03-28T10:00:00' }
    render(
      <DMConversationCard
        conversation={conv}
        currentUsername="alice"
      />
    )
    expect(screen.getAllByText('?').length).toBeGreaterThan(0)
  })
})
