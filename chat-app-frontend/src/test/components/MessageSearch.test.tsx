import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Message } from '../../types'
import MessageSearch from '../../components/chat/MessageSearch'

const makeMsg = (id: string, content: string, sender = 'alice'): Message => ({
  id, roomId: 'general', sender, senderName: sender, content,
  messageType: 'TEXT', readBy: [], timestamp: '2026-03-28T10:00:00',
})

describe('MessageSearch', () => {
  const onClose = vi.fn()
  const onScrollTo = vi.fn()
  const messages = [
    makeMsg('1', 'Hello world'),
    makeMsg('2', 'Goodbye world'),
    makeMsg('3', 'Something else'),
  ]

  beforeEach(() => vi.clearAllMocks())

  it('renders search input', () => {
    render(<MessageSearch messages={messages} onClose={onClose} onScrollTo={onScrollTo} />)
    expect(screen.getByTestId('message-search-input')).toBeInTheDocument()
  })

  it('shows no results section when query is empty', () => {
    render(<MessageSearch messages={messages} onClose={onClose} onScrollTo={onScrollTo} />)
    expect(screen.queryByTestId('search-results')).not.toBeInTheDocument()
  })

  it('shows matching messages when query is typed', async () => {
    render(<MessageSearch messages={messages} onClose={onClose} onScrollTo={onScrollTo} />)
    await userEvent.type(screen.getByTestId('message-search-input'), 'world')
    expect(screen.getAllByTestId('search-result-item')).toHaveLength(2)
  })

  it('shows no results message when nothing matches', async () => {
    render(<MessageSearch messages={messages} onClose={onClose} onScrollTo={onScrollTo} />)
    await userEvent.type(screen.getByTestId('message-search-input'), 'zzznomatch')
    expect(screen.getByText(/No messages match/)).toBeInTheDocument()
  })

  it('calls onScrollTo and onClose when result clicked', async () => {
    render(<MessageSearch messages={messages} onClose={onClose} onScrollTo={onScrollTo} />)
    await userEvent.type(screen.getByTestId('message-search-input'), 'hello')
    await userEvent.click(screen.getByTestId('search-result-item'))
    expect(onScrollTo).toHaveBeenCalledWith('1')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when close button is clicked', async () => {
    render(<MessageSearch messages={messages} onClose={onClose} onScrollTo={onScrollTo} />)
    await userEvent.click(screen.getByTestId('close-search-btn'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
