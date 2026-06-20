import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const create = vi.fn()
vi.mock('../../store/storyStore', () => ({
  useStoryStore: (selector: (s: { createStory: typeof create }) => unknown) => selector({ createStory: create }),
}))
vi.mock('../../api/upload', () => ({
  uploadApi: { uploadFile: vi.fn().mockResolvedValue({ url: 'https://cdn/x.png', messageType: 'IMAGE', bytes: 1 }) },
}))

import StoryComposer from '../../components/story/StoryComposer'
import { uploadApi } from '../../api/upload'

describe('StoryComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    create.mockResolvedValue(undefined)
    // jsdom doesn't implement object URLs — stub them for the image preview.
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
  })

  it('does not render when closed', () => {
    render(<StoryComposer open={false} onClose={vi.fn()} />)
    expect(screen.queryByTestId('story-composer')).not.toBeInTheDocument()
  })

  it('disables Share until there is text', () => {
    render(<StoryComposer open onClose={vi.fn()} />)
    expect(screen.getByTestId('story-post-btn')).toBeDisabled()
    fireEvent.change(screen.getByTestId('story-text-input'), { target: { value: 'hello' } })
    expect(screen.getByTestId('story-post-btn')).not.toBeDisabled()
  })

  it('posts a text story with the chosen background', async () => {
    const onClose = vi.fn()
    render(<StoryComposer open onClose={onClose} />)
    fireEvent.change(screen.getByTestId('story-text-input'), { target: { value: 'hello' } })
    fireEvent.click(screen.getByTestId('story-bg-violet'))
    fireEvent.click(screen.getByTestId('story-post-btn'))
    await waitFor(() => expect(create).toHaveBeenCalledWith({ type: 'TEXT', content: 'hello', backgroundColor: 'violet' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('shows a preview after selecting a photo and does NOT upload until Share', () => {
    render(<StoryComposer open onClose={vi.fn()} />)
    const file = new File(['x'], 'pic.png', { type: 'image/png' })
    fireEvent.change(screen.getByTestId('story-image-input'), { target: { files: [file] } })
    // Preview + caption appear; nothing uploaded/posted yet
    expect(screen.getByTestId('story-image-preview')).toBeInTheDocument()
    expect(screen.getByTestId('story-caption-input')).toBeInTheDocument()
    expect(uploadApi.uploadFile).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it('uploads and posts the image with a caption when Share is tapped', async () => {
    const onClose = vi.fn()
    render(<StoryComposer open onClose={onClose} />)
    const file = new File(['x'], 'pic.png', { type: 'image/png' })
    fireEvent.change(screen.getByTestId('story-image-input'), { target: { files: [file] } })
    fireEvent.change(screen.getByTestId('story-caption-input'), { target: { value: 'my caption' } })
    fireEvent.click(screen.getByTestId('story-post-btn'))
    await waitFor(() => expect(uploadApi.uploadFile).toHaveBeenCalled())
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ type: 'IMAGE', mediaUrl: 'https://cdn/x.png', content: 'my caption' })))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('can remove the selected photo and return to text mode', () => {
    render(<StoryComposer open onClose={vi.fn()} />)
    const file = new File(['x'], 'pic.png', { type: 'image/png' })
    fireEvent.change(screen.getByTestId('story-image-input'), { target: { files: [file] } })
    expect(screen.getByTestId('story-image-preview')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('story-image-remove'))
    expect(screen.queryByTestId('story-image-preview')).not.toBeInTheDocument()
    expect(screen.getByTestId('story-text-input')).toBeInTheDocument()
  })
})
