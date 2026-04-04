// import { render, screen, fireEvent, waitFor } from '@testing-library/react'
// import { describe, it, expect, vi, beforeEach } from 'vitest'

// import type { Message } from '../../types'

// // Mock search API
// vi.mock('../../api/search', () => ({
//   searchApi: {
//     searchMessages: vi.fn(),
//   },
// }))

// import { searchApi } from '../../api/search'

// const mockMessages: Message[] = [
//   {
//     id: 'msg1',
//     roomId: 'general',
//     sender: 'alice',
//     senderName: 'Alice',
//     content: 'hello world',
//     messageType: 'TEXT',
//     readBy: [],
//     timestamp: '2025-01-01T10:00:00Z',
//   },
//   {
//     id: 'msg2',
//     roomId: 'dm:conv1',
//     sender: 'bob',
//     senderName: 'Bob',
//     content: 'hello there',
//     messageType: 'TEXT',
//     readBy: [],
//     timestamp: '2025-01-01T09:00:00Z',
//   },
// ]

// describe('GlobalSearchModal', () => {
//   beforeEach(() => {
//     vi.clearAllMocks()
//     vi.mocked(searchApi.searchMessages).mockResolvedValue(mockMessages)
//   })

//   it('renders when open', () => {
//     render(
//       <GlobalSearchModal
//         open={true}
//         onClose={vi.fn()}
//         onNavigate={vi.fn()}
//         currentUsername="alice"
//       />,
//     )
//     expect(screen.getByTestId('global-search-modal')).toBeDefined()
//     expect(screen.getByTestId('global-search-input')).toBeDefined()
//   })

//   it('does not render when closed', () => {
//     render(
//       <GlobalSearchModal
//         open={false}
//         onClose={vi.fn()}
//         onNavigate={vi.fn()}
//         currentUsername="alice"
//       />,
//     )
//     expect(screen.queryByTestId('global-search-modal')).toBeNull()
//   })

//   it('calls onClose when backdrop is clicked', () => {
//     const onClose = vi.fn()
//     render(
//       <GlobalSearchModal open={true} onClose={onClose} onNavigate={vi.fn()} currentUsername="alice" />,
//     )
//     fireEvent.click(screen.getByTestId('search-backdrop'))
//     expect(onClose).toHaveBeenCalledOnce()
//   })

//   it('calls onClose when close button is clicked', () => {
//     const onClose = vi.fn()
//     render(
//       <GlobalSearchModal open={true} onClose={onClose} onNavigate={vi.fn()} currentUsername="alice" />,
//     )
//     fireEvent.click(screen.getByTestId('search-close-btn'))
//     expect(onClose).toHaveBeenCalledOnce()
//   })

//   it('shows empty state prompt when query is empty', () => {
//     render(
//       <GlobalSearchModal open={true} onClose={vi.fn()} onNavigate={vi.fn()} currentUsername="alice" />,
//     )
//     expect(screen.getByText('Search across all your conversations')).toBeDefined()
//   })

//   it('shows hint when query is too short', () => {
//     render(
//       <GlobalSearchModal open={true} onClose={vi.fn()} onNavigate={vi.fn()} currentUsername="alice" />,
//     )
//     fireEvent.change(screen.getByTestId('global-search-input'), { target: { value: 'h' } })
//     expect(screen.getByText('Type at least 2 characters to search')).toBeDefined()
//   })

//   it('shows search results after debounce', async () => {
//     render(
//       <GlobalSearchModal open={true} onClose={vi.fn()} onNavigate={vi.fn()} currentUsername="alice" />,
//     )
//     fireEvent.change(screen.getByTestId('global-search-input'), { target: { value: 'hello' } })

//     await waitFor(() => {
//       expect(screen.getAllByTestId('search-result-item').length).toBe(2)
//     }, { timeout: 1000 })
//   })

//   it('shows "No results" when search returns empty', async () => {
//     vi.mocked(searchApi.searchMessages).mockResolvedValue([])
//     render(
//       <GlobalSearchModal open={true} onClose={vi.fn()} onNavigate={vi.fn()} currentUsername="alice" />,
//     )
//     fireEvent.change(screen.getByTestId('global-search-input'), { target: { value: 'xyz123' } })

//     await waitFor(() => {
//       expect(screen.getByTestId('search-no-results')).toBeDefined()
//     }, { timeout: 1000 })
//   })

//   it('calls onNavigate when result is clicked', async () => {
//     const onNavigate = vi.fn()
//     const onClose = vi.fn()
//     render(
//       <GlobalSearchModal open={true} onClose={onClose} onNavigate={onNavigate} currentUsername="alice" />,
//     )
//     fireEvent.change(screen.getByTestId('global-search-input'), { target: { value: 'hello' } })

//     await waitFor(() => {
//       expect(screen.getAllByTestId('search-result-item').length).toBeGreaterThan(0)
//     }, { timeout: 1000 })

//     fireEvent.click(screen.getAllByTestId('search-result-item')[0])
//     expect(onNavigate).toHaveBeenCalledWith(mockMessages[0])
//     expect(onClose).toHaveBeenCalled()
//   })

//   it('shows error state when search fails', async () => {
//     vi.mocked(searchApi.searchMessages).mockRejectedValue(new Error('Network error'))
//     render(
//       <GlobalSearchModal open={true} onClose={vi.fn()} onNavigate={vi.fn()} currentUsername="alice" />,
//     )
//     fireEvent.change(screen.getByTestId('global-search-input'), { target: { value: 'hello' } })

//     await waitFor(() => {
//       expect(screen.getByTestId('search-error')).toBeDefined()
//     }, { timeout: 1000 })
//   })
// })
