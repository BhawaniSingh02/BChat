import apiClient from './client';
import { CallSession } from '../types';

export const callsApi = {
  getConversationHistory: (conversationId: string) =>
    apiClient.get<CallSession[]>(`/calls/${conversationId}/history`).then((r) => r.data),

  getMyHistory: () => apiClient.get<CallSession[]>('/calls/history').then((r) => r.data),
};
