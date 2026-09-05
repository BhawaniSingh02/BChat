import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Message, Room, DirectConversation, User } from '../../types'

vi.mock('../../api/search', () => ({
  searchApi: { searchMessages: vi.fn() },
}))

import GlobalSearchModal from '../../components/ui/GlobalSearchModal'
import { searchApi } from '../../api/search'

const makeMsg = (id: string, roomId: string, content: string, sender = 'alice'): Message => ({
  id, roomId, sender, senderName: sender, content,
  messageType: 'TEXT', readBy: [], timestamp: '2026-03-28T10:00:00',
})

const room: Room = {
  roomId: 'general', name: 'General', createdBy: 'alice', memberCount: 2, members: ['alice', 'bob'],
} as Room

const conversation: DirectConversation = {
  id: 'conv1', participants: ['me', 'bob'], lastMessageAt: '2026-03-28T10:00:00',
} as DirectConversation

const bob: User = { id: 'b', username: 'bob', email: 'b@e.com', displayName: 'Bob', uniqueHandle: 'bob', createdAt: '', lastSeen: '' }

describe('GlobalSearchModal', () => {
  const onClose = vi.fn()
  const onNavigate = vi.fn()

  beforeEach(() => vi.clearAllMocks())

  const renderModal = (open = true) =>
    render(
      <GlobalSearchModal
        open={open}
        onClose={onClose}
        onNavigate={onNavigate}
        currentUsername="me"
        rooms={[room]}
        conversations={[conversation]}
        userCache={{ bob }}
      />
    )

  it('renders nothing when closed', () => {
    renderModal(false)
    expect(screen.queryByTestId('global-search-modal')).not.toBeInTheDocument()
  })

  it('renders the search input when open', () => {
    renderModal()
    expect(screen.getByTestId('global-search-input')).toBeInTheDocument()
  })

  it('does not search until at least 2 characters are typed', async () => {
    renderModal()
    await userEvent.type(screen.getByTestId('global-search-input'), 'a')
    await new Promise((r) => setTimeout(r, 400))
    expect(searchApi.searchMessages).not.toHaveBeenCalled()
  })

  it('searches and groups results by conversation, resolving friendly labels', async () => {
    vi.mocked(searchApi.searchMessages).mockResolvedValue([
      makeMsg('1', 'general', 'hello from room'),
      makeMsg('2', 'dm:conv1', 'hello from dm', 'bob'),
    ])
    renderModal()
    await userEvent.type(screen.getByTestId('global-search-input'), 'hello')
    await waitFor(() => expect(screen.getAllByTestId('search-result-item')).toHaveLength(2))
    expect(screen.getByText('#General')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('shows a no-results message when nothing matches', async () => {
    vi.mocked(searchApi.searchMessages).mockResolvedValue([])
    renderModal()
    await userEvent.type(screen.getByTestId('global-search-input'), 'zzznomatch')
    await waitFor(() => expect(screen.getByTestId('search-no-results')).toBeInTheDocument())
  })

  it('shows an error message when the search fails', async () => {
    vi.mocked(searchApi.searchMessages).mockRejectedValue(new Error('network error'))
    renderModal()
    await userEvent.type(screen.getByTestId('global-search-input'), 'hello')
    await waitFor(() => expect(screen.getByTestId('search-error')).toBeInTheDocument())
  })

  it('calls onNavigate and onClose when a result is clicked', async () => {
    const msg = makeMsg('1', 'general', 'hello from room')
    vi.mocked(searchApi.searchMessages).mockResolvedValue([msg])
    renderModal()
    await userEvent.type(screen.getByTestId('global-search-input'), 'hello')
    await waitFor(() => expect(screen.getByTestId('search-result-item')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('search-result-item'))
    expect(onNavigate).toHaveBeenCalledWith(msg)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when the close button is clicked', async () => {
    renderModal()
    await userEvent.click(screen.getByTestId('search-close-btn'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when the backdrop is clicked', async () => {
    renderModal()
    await userEvent.click(screen.getByTestId('search-backdrop'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose on Escape', async () => {
    renderModal()
    await userEvent.type(screen.getByTestId('global-search-input'), '{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('resets query and results each time it is opened', async () => {
    vi.mocked(searchApi.searchMessages).mockResolvedValue([makeMsg('1', 'general', 'hello from room')])
    const { rerender } = renderModal(false)
    rerender(
      <GlobalSearchModal
        open
        onClose={onClose}
        onNavigate={onNavigate}
        currentUsername="me"
        rooms={[room]}
        conversations={[conversation]}
        userCache={{ bob }}
      />
    )
    expect(screen.getByTestId('global-search-input')).toHaveValue('')
  })
})
