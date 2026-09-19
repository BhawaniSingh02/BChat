import apiClient from './client';
import { MessageType } from '../types';

export interface UploadResponse {
  url: string;
  messageType: MessageType;
  bytes: number;
}

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
}

export const uploadApi = {
  uploadFile: (file: PickedFile): Promise<UploadResponse> => {
    const formData = new FormData();
    // React Native's FormData accepts this {uri, name, type} shape for multipart file fields.
    formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    return apiClient
      .post<UploadResponse>('/upload', formData)
      .then((r) => r.data)
      .catch((err) => {
        const serverError = err?.response?.data?.error;
        throw new Error(serverError ?? 'Upload failed. Please try again.');
      });
  },
};
