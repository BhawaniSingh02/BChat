import client from './client'
import type { CallSession } from '../types'

export const callsApi = {
  getCallHistory: async (conversationId: string): Promise<CallSession[]> => {
    const { data } = await client.get<CallSession[]>(`/calls/${conversationId}/history`)
    return data
  },

  /** The current user's full call history across all conversations, newest first. */
  getMyCallHistory: async (): Promise<CallSession[]> => {
    const { data } = await client.get<CallSession[]>('/calls/history')
    return data
  },
}
