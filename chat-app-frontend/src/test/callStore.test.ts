import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCallStore } from '../store/callStore'
import type { CallEvent } from '../types'

// Mock the calls API
vi.mock('../api/calls', () => ({
  callsApi: {
    getCallHistory: vi.fn().mockResolvedValue([]),
  },
}))

function resetStore() {
  useCallStore.setState({
    callState: 'idle',
    callSessionId: null,
    conversationId: null,
    otherUsername: null,
    callType: null,
    pendingSdp: null,
    busyReason: null,
    callHistory: {},
  })
}

describe('callStore', () => {
  beforeEach(() => {
    resetStore()
  })

  it('starts in idle state', () => {
    const s = useCallStore.getState()
    expect(s.callState).toBe('idle')
    expect(s.callSessionId).toBeNull()
    expect(s.otherUsername).toBeNull()
  })

  describe('startOutgoingCall', () => {
    it('sets ringing_outgoing state with correct fields', () => {
      useCallStore.getState().startOutgoingCall('conv-1', 'bob', 'AUDIO')
      const s = useCallStore.getState()
      expect(s.callState).toBe('ringing_outgoing')
      expect(s.conversationId).toBe('conv-1')
      expect(s.otherUsername).toBe('bob')
      expect(s.callType).toBe('AUDIO')
    })

    it('sets ringing_outgoing for video call', () => {
      useCallStore.getState().startOutgoingCall('conv-2', 'alice', 'VIDEO')
      expect(useCallStore.getState().callType).toBe('VIDEO')
    })
  })

  describe('receiveIncomingCall', () => {
    it('sets ringing_incoming state with callee info', () => {
      const event: CallEvent = {
        eventType: 'INCOMING_CALL',
        callSessionId: 'sess-1',
        conversationId: 'conv-1',
        fromUsername: 'alice',
        callType: 'VIDEO',
        payload: '{"type":"offer"}',
      }
      useCallStore.getState().receiveIncomingCall(event)
      const s = useCallStore.getState()
      expect(s.callState).toBe('ringing_incoming')
      expect(s.callSessionId).toBe('sess-1')
      expect(s.otherUsername).toBe('alice')
      expect(s.callType).toBe('VIDEO')
      expect(s.pendingSdp).toBe('{"type":"offer"}')
    })

    it('handles missing payload gracefully', () => {
      const event: CallEvent = {
        eventType: 'INCOMING_CALL',
        callSessionId: 'sess-2',
        conversationId: 'conv-2',
        fromUsername: 'bob',
        callType: 'AUDIO',
      }
      useCallStore.getState().receiveIncomingCall(event)
      expect(useCallStore.getState().pendingSdp).toBeNull()
    })
  })

  describe('callAnswered', () => {
    it('transitions to active state', () => {
      useCallStore.setState({ callState: 'ringing_outgoing', callSessionId: 'sess-1' })
      const event: CallEvent = {
        eventType: 'CALL_ANSWERED',
        callSessionId: 'sess-1',
        conversationId: 'conv-1',
        fromUsername: 'bob',
        callType: 'AUDIO',
        payload: '{"type":"answer"}',
      }
      useCallStore.getState().callAnswered(event)
      const s = useCallStore.getState()
      expect(s.callState).toBe('active')
      expect(s.pendingSdp).toBe('{"type":"answer"}')
    })
  })

  describe('endCall', () => {
    it('resets all call state to idle', () => {
      useCallStore.setState({
        callState: 'active',
        callSessionId: 'sess-1',
        conversationId: 'conv-1',
        otherUsername: 'bob',
        callType: 'AUDIO',
      })
      useCallStore.getState().endCall()
      const s = useCallStore.getState()
      expect(s.callState).toBe('idle')
      expect(s.callSessionId).toBeNull()
      expect(s.conversationId).toBeNull()
      expect(s.otherUsername).toBeNull()
      expect(s.callType).toBeNull()
    })

    it('clears busyReason on end', () => {
      useCallStore.setState({ callState: 'busy', busyReason: 'On another call' })
      useCallStore.getState().endCall()
      expect(useCallStore.getState().busyReason).toBeNull()
    })
  })

  describe('callBusy', () => {
    it('sets busy state with reason', () => {
      useCallStore.setState({ callState: 'ringing_outgoing', otherUsername: 'bob', callType: 'AUDIO' })
      useCallStore.getState().callBusy('On another call')
      const s = useCallStore.getState()
      expect(s.callState).toBe('busy')
      expect(s.busyReason).toBe('On another call')
    })

    it('clears callSessionId and pendingSdp', () => {
      useCallStore.setState({ callSessionId: 'sess-1', pendingSdp: 'sdp' })
      useCallStore.getState().callBusy('busy')
      const s = useCallStore.getState()
      expect(s.callSessionId).toBeNull()
      expect(s.pendingSdp).toBeNull()
    })
  })

  describe('fetchCallHistory', () => {
    it('stores fetched history by conversationId', async () => {
      const { callsApi } = await import('../api/calls')
      const mockSessions = [
        { id: 's1', conversationId: 'conv-1', callerId: 'alice', calleeId: 'bob', callType: 'AUDIO', status: 'ENDED', startedAt: new Date().toISOString(), durationSeconds: 60 }
      ]
      vi.mocked(callsApi.getCallHistory).mockResolvedValueOnce(mockSessions as any)

      await useCallStore.getState().fetchCallHistory('conv-1')

      const history = useCallStore.getState().callHistory['conv-1']
      expect(history).toHaveLength(1)
      expect(history[0].id).toBe('s1')
    })

    it('does not throw when API fails', async () => {
      const { callsApi } = await import('../api/calls')
      vi.mocked(callsApi.getCallHistory).mockRejectedValueOnce(new Error('Network error'))

      await expect(useCallStore.getState().fetchCallHistory('conv-1')).resolves.not.toThrow()
    })
  })
})
