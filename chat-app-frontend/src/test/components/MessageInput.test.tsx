import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MessageInput from '../../components/chat/MessageInput'
import { uploadApi } from '../../api/upload'

vi.mock('../../api/upload')

describe('MessageInput', () => {
  const onSend = vi.fn()
  const onTyping = vi.fn()

  beforeEach(() => {
    onSend.mockReset()
    onTyping.mockReset()
    vi.clearAllMocks()
  })

  // ── Basic send ────────────────────────────────────────────────────────────

  it('renders textarea and send button', () => {
    render(<MessageInput onSend={onSend} />)
    expect(screen.getByLabelText('Message input')).toBeInTheDocument()
    expect(screen.getByLabelText('Send message')).toBeInTheDocument()
  })

  it('calls onSend with trimmed content when send button clicked', async () => {
    render(<MessageInput onSend={onSend} />)
    await userEvent.type(screen.getByLabelText('Message input'), 'Hello World')
    await userEvent.click(screen.getByLabelText('Send message'))
    expect(onSend).toHaveBeenCalledWith('Hello World', undefined, undefined, undefined)
  })

  it('calls onSend when Enter pressed', async () => {
    render(<MessageInput onSend={onSend} />)
    await userEvent.type(screen.getByLabelText('Message input'), 'Hello{Enter}')
    expect(onSend).toHaveBeenCalledWith('Hello', undefined, undefined, undefined)
  })

  it('does not call onSend on Shift+Enter', async () => {
    render(<MessageInput onSend={onSend} />)
    await userEvent.type(screen.getByLabelText('Message input'), 'Hello{Shift>}{Enter}{/Shift}')
    expect(onSend).not.toHaveBeenCalled()
  })

  it('clears input after sending', async () => {
    render(<MessageInput onSend={onSend} />)
    const input = screen.getByLabelText('Message input') as HTMLTextAreaElement
    await userEvent.type(input, 'Hello')
    await userEvent.click(screen.getByLabelText('Send message'))
    expect(input.value).toBe('')
  })

  it('does not call onSend when input is empty', async () => {
    render(<MessageInput onSend={onSend} />)
    await userEvent.click(screen.getByLabelText('Send message'))
    expect(onSend).not.toHaveBeenCalled()
  })

  it('send button is disabled when input is empty', () => {
    render(<MessageInput onSend={onSend} />)
    expect(screen.getByLabelText('Send message')).toBeDisabled()
  })

  it('send button is enabled when input has content', async () => {
    render(<MessageInput onSend={onSend} />)
    await userEvent.type(screen.getByLabelText('Message input'), 'Hello')
    expect(screen.getByLabelText('Send message')).not.toBeDisabled()
  })

  it('shows custom placeholder', () => {
    render(<MessageInput onSend={onSend} placeholder="Message #general" />)
    expect(screen.getByPlaceholderText('Message #general')).toBeInTheDocument()
  })

  it('calls onTyping when user types', async () => {
    render(<MessageInput onSend={onSend} onTyping={onTyping} />)
    await userEvent.type(screen.getByLabelText('Message input'), 'H')
    expect(onTyping).toHaveBeenCalledWith(true)
  })

  // ── File attachment ───────────────────────────────────────────────────────

  it('renders attach file button', () => {
    render(<MessageInput onSend={onSend} />)
    expect(screen.getByLabelText('Attach file')).toBeInTheDocument()
  })

  it('renders hidden file input', () => {
    render(<MessageInput onSend={onSend} />)
    expect(screen.getByTestId('file-input')).toBeInTheDocument()
  })

  it('calls onSend with fileUrl and messageType after successful image upload', async () => {
    vi.mocked(uploadApi.uploadFile).mockResolvedValue({
      url: 'https://cdn.example.com/photo.jpg',
      messageType: 'IMAGE',
      bytes: 500,
    })

    render(<MessageInput onSend={onSend} />)
    const fileInput = screen.getByTestId('file-input')
    const file = new File(['x'.repeat(100)], 'photo.jpg', { type: 'image/jpeg' })

    await userEvent.upload(fileInput, file)

    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith(
        'photo.jpg',
        'https://cdn.example.com/photo.jpg',
        'IMAGE',
        undefined
      )
    })
  })

  it('calls onSend with FILE type for PDF upload', async () => {
    vi.mocked(uploadApi.uploadFile).mockResolvedValue({
      url: 'https://cdn.example.com/doc.pdf',
      messageType: 'FILE',
      bytes: 1000,
    })

    render(<MessageInput onSend={onSend} />)
    const fileInput = screen.getByTestId('file-input')
    const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' })

    await userEvent.upload(fileInput, file)

    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith('doc.pdf', 'https://cdn.example.com/doc.pdf', 'FILE', undefined)
    })
  })

  it('shows upload progress bar while uploading', async () => {
    let resolveUpload!: (v: any) => void
    vi.mocked(uploadApi.uploadFile).mockImplementation((_, onProgress) => {
      onProgress?.(50)
      return new Promise((res) => { resolveUpload = res })
    })

    render(<MessageInput onSend={onSend} />)
    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' })
    await userEvent.upload(screen.getByTestId('file-input'), file)

    expect(screen.getByTestId('upload-progress')).toBeInTheDocument()
    await act(async () => {
      resolveUpload({ url: 'https://cdn.example.com/x.jpg', messageType: 'IMAGE', bytes: 7 })
    })
  })

  it('shows error message when upload fails', async () => {
    vi.mocked(uploadApi.uploadFile).mockRejectedValue(new Error('Network error'))

    render(<MessageInput onSend={onSend} />)
    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' })
    await userEvent.upload(screen.getByTestId('file-input'), file)

    await waitFor(() => {
      expect(screen.getByTestId('upload-error')).toBeInTheDocument()
    })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('shows error for files exceeding size limit', async () => {
    render(<MessageInput onSend={onSend} />)
    const bigFile = new File(['x'], 'huge.jpg', { type: 'image/jpeg' })
    Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 })

    await userEvent.upload(screen.getByTestId('file-input'), bigFile)

    expect(screen.getByTestId('upload-error')).toHaveTextContent('File too large')
    expect(uploadApi.uploadFile).not.toHaveBeenCalled()
  })

  it('disables attach button while uploading', async () => {
    let resolveUpload!: (v: any) => void
    vi.mocked(uploadApi.uploadFile).mockImplementation(() =>
      new Promise((res) => { resolveUpload = res })
    )

    render(<MessageInput onSend={onSend} />)
    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' })
    await userEvent.upload(screen.getByTestId('file-input'), file)

    expect(screen.getByLabelText('Attach file')).toBeDisabled()
    await act(async () => {
      resolveUpload({ url: 'https://cdn.example.com/x.jpg', messageType: 'IMAGE', bytes: 7 })
    })
  })
})
