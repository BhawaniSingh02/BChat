import client from './client'
import type { CallSession } from '../types'

export const callsApi = {
  getCallHistory: async (conversationId: string): Promise<CallSession[]> => {
    const { data } = await client.get<CallSession[]>(`/calls/${conversationId}/history`)
    return data
  },
}
