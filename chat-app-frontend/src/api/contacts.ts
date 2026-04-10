import client from './client'
import type { ContactRequest, User } from '../types'

export const contactsApi = {
  /** Find a user by exact uniqueHandle. */
  findByHandle: (handle: string) =>
    client.get<User>(`/users/find?handle=${encodeURIComponent(handle)}`).then((r) => r.data),

  /** Send a contact request to a user by their handle. */
  sendRequest: (toHandle: string) =>
    client.post<ContactRequest>('/contacts/request', { toHandle }).then((r) => r.data),

  /** List incoming pending contact requests. */
  listIncoming: () =>
    client.get<ContactRequest[]>('/contacts/requests').then((r) => r.data),

  /** Accept a contact request. */
  accept: (id: string) =>
    client.post<ContactRequest>(`/contacts/request/${id}/accept`).then((r) => r.data),

  /** Reject a contact request. */
  reject: (id: string) =>
    client.post<ContactRequest>(`/contacts/request/${id}/reject`).then((r) => r.data),

  /** Get own whoCanMessage privacy setting. */
  getPrivacy: () =>
    client.get<{ whoCanMessage: string }>('/users/me/privacy').then((r) => r.data),

  /** Update whoCanMessage privacy setting. */
  updatePrivacy: (whoCanMessage: 'ANYONE' | 'APPROVED_ONLY' | 'NOBODY') =>
    client.patch<{ whoCanMessage: string }>('/users/me/privacy', { whoCanMessage }).then((r) => r.data),
}
