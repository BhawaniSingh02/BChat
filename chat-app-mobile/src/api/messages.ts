import apiClient from './client';
import { Message } from '../types';

export const messagesApi = {
  /** Toggles star for the current user on this message. Returns the updated message. */
  toggleStar: (messageId: string) => apiClient.post<Message>(`/messages/${messageId}/star`).then((r) => r.data),

  getStarred: () => apiClient.get<Message[]>('/messages/starred').then((r) => r.data),

  /** Forwards a message to a room or DM conversation. Returns the newly created message. */
  forward: (messageId: string, target: { roomId: string } | { conversationId: string }) =>
    apiClient.post<Message>(`/messages/${messageId}/forward`, target).then((r) => r.data),

  /** All shared images/video/files/audio for a room or DM, most recent first. */
  getMedia: (roomId: string) => apiClient.get<Message[]>('/messages/media', { params: { roomId } }).then((r) => r.data),
};
