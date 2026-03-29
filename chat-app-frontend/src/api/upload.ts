import client from './client'
import type { MessageType } from '../types'

export interface UploadResponse {
  url: string
  messageType: MessageType
  bytes: number
}

export const uploadApi = {
  uploadFile: (file: File, onProgress?: (pct: number) => void): Promise<UploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    return client
      .post<UploadResponse>('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total && onProgress) {
            onProgress(Math.round((e.loaded * 100) / e.total))
          }
        },
      })
      .then((r) => r.data)
  },
}
