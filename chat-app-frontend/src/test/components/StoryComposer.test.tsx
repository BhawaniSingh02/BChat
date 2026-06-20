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

  it('uploads and posts an image story', async () => {
    const onClose = vi.fn()
    render(<StoryComposer open onClose={onClose} />)
    const file = new File(['x'], 'pic.png', { type: 'image/png' })
    fireEvent.change(screen.getByTestId('story-image-input'), { target: { files: [file] } })
    await waitFor(() => expect(uploadApi.uploadFile).toHaveBeenCalled())
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ type: 'IMAGE', mediaUrl: 'https://cdn/x.png' })))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})
