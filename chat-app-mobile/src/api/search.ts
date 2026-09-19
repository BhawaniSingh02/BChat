import apiClient from './client';
import { Message } from '../types';

export const searchApi = {
  searchMessages: (q: string, limit = 20) =>
    apiClient.get<Message[]>('/search/messages', { params: { q, limit } }).then((r) => r.data),
};
