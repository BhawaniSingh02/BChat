import { create } from 'zustand'
import type { ContactRequest, User } from '../types'
import { contactsApi } from '../api/contacts'

interface ContactState {
  incoming: ContactRequest[]
  isLoading: boolean
  error: string | null

  loadIncoming: () => Promise<void>
  accept: (id: string) => Promise<void>
  reject: (id: string) => Promise<void>
  findByHandle: (handle: string) => Promise<User>
  sendRequest: (toHandle: string) => Promise<ContactRequest>
}

export const useContactStore = create<ContactState>((set) => ({
  incoming: [],
  isLoading: false,
  error: null,

  loadIncoming: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await contactsApi.listIncoming()
      set({ incoming: data, isLoading: false })
    } catch {
      set({ error: 'Failed to load contact requests', isLoading: false })
    }
  },

  accept: async (id) => {
    await contactsApi.accept(id)
    set((s) => ({ incoming: s.incoming.filter((r) => r.id !== id) }))
  },

  reject: async (id) => {
    await contactsApi.reject(id)
    set((s) => ({ incoming: s.incoming.filter((r) => r.id !== id) }))
  },

  findByHandle: async (handle) => {
    return contactsApi.findByHandle(handle)
  },

  sendRequest: async (toHandle) => {
    return contactsApi.sendRequest(toHandle)
  },
}))
