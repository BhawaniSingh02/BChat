import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadApi } from '../../api/upload'
import client from '../../api/client'

vi.mock('../../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}))

describe('uploadApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts to /upload with FormData', async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: { url: 'https://cdn.example.com/img.jpg', messageType: 'IMAGE', bytes: 500 },
    })

    const file = new File(['content'], 'img.jpg', { type: 'image/jpeg' })
    const result = await uploadApi.uploadFile(file)

    expect(client.post).toHaveBeenCalledWith(
      '/upload',
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } })
    )
    expect(result.url).toBe('https://cdn.example.com/img.jpg')
    expect(result.messageType).toBe('IMAGE')
  })

  it('calls onProgress callback with percentage', async () => {
    vi.mocked(client.post).mockImplementation((_, __, config) => {
      // Simulate progress event
      config?.onUploadProgress?.({ loaded: 50, total: 100 } as any)
      return Promise.resolve({ data: { url: 'https://cdn.example.com/img.jpg', messageType: 'IMAGE', bytes: 100 } })
    })

    const onProgress = vi.fn()
    const file = new File(['content'], 'img.jpg', { type: 'image/jpeg' })
    await uploadApi.uploadFile(file, onProgress)

    expect(onProgress).toHaveBeenCalledWith(50)
  })

  it('does not call onProgress if total is undefined', async () => {
    vi.mocked(client.post).mockImplementation((_, __, config) => {
      config?.onUploadProgress?.({ loaded: 50 } as any)
      return Promise.resolve({ data: { url: 'https://cdn.example.com/img.jpg', messageType: 'IMAGE', bytes: 50 } })
    })

    const onProgress = vi.fn()
    const file = new File(['content'], 'img.jpg', { type: 'image/jpeg' })
    await uploadApi.uploadFile(file, onProgress)

    expect(onProgress).not.toHaveBeenCalled()
  })

  it('propagates errors from the API client', async () => {
    vi.mocked(client.post).mockRejectedValue(new Error('Network error'))

    const file = new File(['content'], 'img.jpg', { type: 'image/jpeg' })
    await expect(uploadApi.uploadFile(file)).rejects.toThrow('Network error')
  })
})
