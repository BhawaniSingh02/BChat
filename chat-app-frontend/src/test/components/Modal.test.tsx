import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from '../../components/ui/Modal'

describe('Modal', () => {
  it('does not render when closed', () => {
    render(<Modal open={false} onClose={vi.fn()} title="Test"><p>Content</p></Modal>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders when open', () => {
    render(<Modal open onClose={vi.fn()} title="Test Modal"><p>Content</p></Modal>)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Test"><p>Content</p></Modal>)
    await userEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when backdrop clicked', async () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Test"><p>Content</p></Modal>)
    await userEvent.click(screen.getByTestId('modal-backdrop'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not close when dialog content clicked', async () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Test"><p>Content</p></Modal>)
    await userEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
