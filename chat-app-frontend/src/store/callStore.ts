import { create } from 'zustand'
import type { CallEvent, CallSession, CallType } from '../types'
import { callsApi } from '../api/calls'

export type CallState = 'idle' | 'ringing_outgoing' | 'ringing_incoming' | 'active' | 'ended' | 'busy'

interface CallStore {
  // Current call state
  callState: CallState
  callSessionId: string | null
  conversationId: string | null
  otherUsername: string | null   // the remote party's username
  callType: CallType | null
  /** For the outgoing caller: the local SDP offer, awaiting answer */
  pendingSdp: string | null
  /** Set when remote party is busy on another call */
  busyReason: string | null

  // History
  callHistory: Record<string, CallSession[]>  // conversationId -> sessions

  // Actions
  /** Called when we initiate a call (before signaling) */
  startOutgoingCall: (conversationId: string, otherUsername: string, callType: CallType) => void
  /** Called when we receive an INCOMING_CALL event */
  receiveIncomingCall: (event: CallEvent) => void
  /** Called when call is ANSWERED (by either side) */
  callAnswered: (event: CallEvent) => void
  /** Called when CALL_ENDED event arrives or we hang up */
  endCall: () => void
  /** Called when callee is already on another call */
  callBusy: (reason: string) => void
  /** Called when CALL_SESSION_CREATED ack arrives — sets the sessionId for the outgoing caller */
  setCallSessionId: (id: string) => void

  fetchCallHistory: (conversationId: string) => Promise<void>
}

export const useCallStore = create<CallStore>((set) => ({
  callState: 'idle',
  callSessionId: null,
  conversationId: null,
  otherUsername: null,
  callType: null,
  pendingSdp: null,
  busyReason: null,
  callHistory: {},

  startOutgoingCall: (conversationId, otherUsername, callType) =>
    set({
      callState: 'ringing_outgoing',
      conversationId,
      otherUsername,
      callType,
      callSessionId: null,
      pendingSdp: null,
    }),

  receiveIncomingCall: (event) =>
    set((prev) => {
      // If already in any call, reject the incoming event to avoid cross-conversation corruption
      if (prev.callState !== 'idle') return prev
      return {
        callState: 'ringing_incoming',
        callSessionId: event.callSessionId,
        conversationId: event.conversationId,
        otherUsername: event.fromUsername,
        callType: event.callType,
        pendingSdp: event.payload ?? null,
      }
    }),

  callAnswered: (event) =>
    set((prev) => ({
      callState: 'active',
      callSessionId: prev.callSessionId ?? event.callSessionId,
      pendingSdp: event.payload ?? null,
    })),

  endCall: () =>
    set({
      callState: 'idle',
      callSessionId: null,
      conversationId: null,
      otherUsername: null,
      callType: null,
      pendingSdp: null,
      busyReason: null,
    }),

  callBusy: (reason) =>
    set(() => ({
      callState: 'busy',
      busyReason: reason,
      // Keep otherUsername/callType for display
      callSessionId: null,
      pendingSdp: null,
    })),

  setCallSessionId: (id) =>
    set({ callSessionId: id }),

  fetchCallHistory: async (conversationId) => {
    try {
      const sessions = await callsApi.getCallHistory(conversationId)
      set((s) => ({ callHistory: { ...s.callHistory, [conversationId]: sessions } }))
    } catch {
      // silently ignore — history is optional
    }
  },
}))
