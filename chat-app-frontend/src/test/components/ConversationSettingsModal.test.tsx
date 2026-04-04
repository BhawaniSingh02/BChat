import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConversationSettingsModal from '../../components/chat/ConversationSettingsModal'
import { messagesApi } from '../../api/messages'
import type { DirectConversation } from '../../types'

vi.mock('../../api/messages', () => ({
  messagesApi: {
    muteDM: vi.fn(),
    unmuteDM: vi.fn(),
    setDisappearingTimer: vi.fn(),
  },
}))

const mockMuteDM = vi.mocked(messagesApi.muteDM)
const mockUnmuteDM = vi.mocked(messagesApi.unmuteDM)
const mockSetDisappearing = vi.mocked(messagesApi.setDisappearingTimer)

const baseConversation: DirectConversation = {
  id: 'conv-1',
  participants: ['alice', 'bob'],
  createdAt: '2026-01-01T00:00:00Z',
  mutedBy: {},
  archivedBy: [],
  disappearingMessagesTimer: 'OFF',
}

describe('ConversationSettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the modal', () => {
    render(
      <ConversationSettingsModal
        conversation={baseConversation}
        currentUsername="alice"
        otherUsername="bob"
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    )
    expect(screen.getByTestId('conversation-settings-modal')).toBeInTheDocument()
  })

  it('shows mute duration buttons when not muted', () => {
    render(
      <ConversationSettingsModal
        conversation={baseConversation}
        currentUsername="alice"
        otherUsername="bob"
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    )
    expect(screen.getByTestId('mute-8H-btn')).toBeInTheDocument()
    expect(screen.getByTestId('mute-1W-btn')).toBeInTheDocument()
    expect(screen.getByTestId('mute-ALWAYS-btn')).toBeInTheDocument()
  })

  it('shows unmute button when already muted', () => {
    const mutedConv: DirectConversation = {
      ...baseConversation,
      mutedBy: { alice: '9999-12-31T23:59:59Z' },
    }
    render(
      <ConversationSettingsModal
        conversation={mutedConv}
        currentUsername="alice"
        otherUsername="bob"
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    )
    expect(screen.getByTestId('unmute-btn')).toBeInTheDocument()
  })

  it('calls muteDM and invokes onUpdated when muting', async () => {
    const updatedConv: DirectConversation = { ...baseConversation, mutedBy: { alice: '9999-12-31T23:59:59Z' } }
    mockMuteDM.mockResolvedValue(updatedConv)
    const onUpdated = vi.fn()

    render(
      <ConversationSettingsModal
        conversation={baseConversation}
        currentUsername="alice"
        otherUsername="bob"
        onClose={vi.fn()}
        onUpdated={onUpdated}
      />
    )

    await userEvent.click(screen.getByTestId('mute-8H-btn'))

    await waitFor(() => {
      expect(mockMuteDM).toHaveBeenCalledWith('conv-1', '8H')
      expect(onUpdated).toHaveBeenCalledWith(updatedConv)
    })
  })

  it('calls unmuteDM when unmuting', async () => {
    const mutedConv: DirectConversation = {
      ...baseConversation,
      mutedBy: { alice: '9999-12-31T23:59:59Z' },
    }
    mockUnmuteDM.mockResolvedValue(baseConversation)
    const onUpdated = vi.fn()

    render(
      <ConversationSettingsModal
        conversation={mutedConv}
        currentUsername="alice"
        otherUsername="bob"
        onClose={vi.fn()}
        onUpdated={onUpdated}
      />
    )

    await userEvent.click(screen.getByTestId('unmute-btn'))

    await waitFor(() => {
      expect(mockUnmuteDM).toHaveBeenCalledWith('conv-1')
      expect(onUpdated).toHaveBeenCalledWith(baseConversation)
    })
  })

  it('calls setDisappearingTimer when selecting timer', async () => {
    const updated: DirectConversation = { ...baseConversation, disappearingMessagesTimer: '7D' }
    mockSetDisappearing.mockResolvedValue(updated)
    const onUpdated = vi.fn()

    render(
      <ConversationSettingsModal
        conversation={baseConversation}
        currentUsername="alice"
        otherUsername="bob"
        onClose={vi.fn()}
        onUpdated={onUpdated}
      />
    )

    await userEvent.click(screen.getByTestId('disappearing-7D-btn'))

    await waitFor(() => {
      expect(mockSetDisappearing).toHaveBeenCalledWith('conv-1', '7D')
      expect(onUpdated).toHaveBeenCalledWith(updated)
    })
  })

  it('highlights the currently active disappearing timer', () => {
    const conv: DirectConversation = { ...baseConversation, disappearingMessagesTimer: '24H' }
    render(
      <ConversationSettingsModal
        conversation={conv}
        currentUsername="alice"
        otherUsername="bob"
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    )
    expect(screen.getByTestId('disappearing-24H-btn')).toHaveClass('bg-emerald-100')
  })

  it('shows block button when onBlock is provided', () => {
    render(
      <ConversationSettingsModal
        conversation={baseConversation}
        currentUsername="alice"
        otherUsername="bob"
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onBlock={vi.fn()}
      />
    )
    expect(screen.getByTestId('block-user-btn')).toBeInTheDocument()
    expect(screen.getByText(/Block bob/i)).toBeInTheDocument()
  })

  it('calls onBlock with the other username when blocking', async () => {
    const onBlock = vi.fn()
    const onClose = vi.fn()

    render(
      <ConversationSettingsModal
        conversation={baseConversation}
        currentUsername="alice"
        otherUsername="bob"
        onClose={onClose}
        onUpdated={vi.fn()}
        onBlock={onBlock}
      />
    )

    await userEvent.click(screen.getByTestId('block-user-btn'))

    expect(onBlock).toHaveBeenCalledWith('bob')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows error when mute fails', async () => {
    mockMuteDM.mockRejectedValue(new Error('Server error'))

    render(
      <ConversationSettingsModal
        conversation={baseConversation}
        currentUsername="alice"
        otherUsername="bob"
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    )

    await userEvent.click(screen.getByTestId('mute-ALWAYS-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('settings-error')).toBeInTheDocument()
    })
  })

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn()
    render(
      <ConversationSettingsModal
        conversation={baseConversation}
        currentUsername="alice"
        otherUsername="bob"
        onClose={onClose}
        onUpdated={vi.fn()}
      />
    )

    await userEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
