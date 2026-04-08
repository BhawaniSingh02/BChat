import { type MutableRefObject, useCallback, useEffect, useRef, useState } from 'react'
import type { CallEvent, CallType, Message } from '../types'
import { useAuthStore } from '../store/authStore'
import { useRoomStore } from '../store/roomStore'
import { useDMStore } from '../store/dmStore'
import { usePresenceStore } from '../store/presenceStore'
import { useChatStore } from '../store/chatStore'
import { useCallStore } from '../store/callStore'

import { useWebSocket } from '../hooks/useWebSocket'
import { useWebRTC } from '../hooks/useWebRTC'
import { useWakeLock } from '../hooks/useWakeLock'
import { startRingtone, startDialTone, playConnectedChime, playHangUpTone, type StopFn } from '../hooks/useCallAudio'
import Sidebar from '../components/layout/Sidebar'
import ChatView from '../components/chat/ChatView'
import DMChatView from '../components/chat/DMChatView'
import ThreadPanel from '../components/chat/ThreadPanel'
import CreateRoomModal from '../components/rooms/CreateRoomModal'
import RoomSettingsModal from '../components/rooms/RoomSettingsModal'
import Modal from '../components/ui/Modal'
import RoomList from '../components/rooms/RoomList'
import QuickSwitcher from '../components/ui/QuickSwitcher'
import UserProfileModal from '../components/ui/UserProfileModal'
import BrandLogo from '../components/ui/BrandLogo'
import IncomingCallOverlay from '../components/call/IncomingCallOverlay'
import ActiveCallView from '../components/call/ActiveCallView'
import OutgoingCallView from '../components/call/OutgoingCallView'
import CallHistoryPanel from '../components/call/CallHistoryPanel'
import { useUserCacheStore } from '../store/userCacheStore'

export default function ChatPage() {
  const { user, token } = useAuthStore()
  const {
    myRooms, rooms, activeRoomId, isLoading: roomsLoading,
    fetchMyRooms, fetchAllRooms, setActiveRoom, leaveRoom, joinRoom,
    kickMember, pinMessage, unpinMessage,
  } = useRoomStore()
  const { conversations, activeDMId, fetchConversations, setActiveDM, resetDMUnread } = useDMStore()
  const { fetchOnlineUsers } = usePresenceStore()
  const resetUnread = useChatStore((s) => s.resetUnread)
  const cache = useUserCacheStore((s) => s.cache)

  // Call state
  const {
    callState, callSessionId, conversationId: callConvId, otherUsername: callOtherUser,
    callType, pendingSdp, busyReason, callHistory,
    startOutgoingCall, receiveIncomingCall, callAnswered, endCall: endCallInStore,
    callBusy, setCallSessionId, fetchCallHistory,
  } = useCallStore()

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const audioStopRef = useRef<StopFn | null>(null)

  // ── Wake Lock: keep screen on during active calls ─────────────────────────
  useWakeLock(callState === 'active')

  // ── Audio feedback lifecycle ──────────────────────────────────────────────
  useEffect(() => {
    audioStopRef.current?.()
    audioStopRef.current = null

    if (callState === 'ringing_incoming') {
      audioStopRef.current = startRingtone()
    } else if (callState === 'ringing_outgoing') {
      audioStopRef.current = startDialTone()
    } else if (callState === 'active') {
      playConnectedChime()
    } else if (callState === 'idle' || callState === 'ended') {
      playHangUpTone()
    }

    return () => {
      audioStopRef.current?.()
      audioStopRef.current = null
    }
  }, [callState])

  // ── Browser tab title flash for incoming calls ────────────────────────────
  useEffect(() => {
    const originalTitle = document.title
    if (callState !== 'ringing_incoming' || !callOtherUser) {
      document.title = originalTitle
      return
    }

    let shown = false
    const id = setInterval(() => {
      document.title = shown ? originalTitle : `📞 Incoming call from ${callOtherUser}…`
      shown = !shown
    }, 1000)

    return () => {
      clearInterval(id)
      document.title = originalTitle
    }
  }, [callState, callOtherUser])

  // ── ICE candidate buffering ───────────────────────────────────────────────
  // callConvId and callSessionId may be null when the first ICE candidates fire
  // (the PC is created before the CALL_SESSION_CREATED ack arrives from the server).
  // We keep always-current refs and buffer candidates until both IDs are known.
  const callConvIdRef = useRef<string | null>(null) as MutableRefObject<string | null>
  const callSessionIdRef = useRef<string | null>(null) as MutableRefObject<string | null>
  const iceCandidateBufferRef = useRef<string[]>([])
  callConvIdRef.current = callConvId
  callSessionIdRef.current = callSessionId

  // ── WebRTC ────────────────────────────────────────────────────────────────
  const { startCall: startWebRTCCall, answerCall: answerWebRTCCall, setRemoteAnswer, addIceCandidate, cleanup: cleanupWebRTC, localStream } = useWebRTC({
    onIceCandidate: (candidateJson) => {
      const convId = callConvIdRef.current
      const sessionId = callSessionIdRef.current
      if (convId && sessionId) {
        sendIceCandidate(convId, sessionId, candidateJson)
      } else {
        // Buffer — session ID arrives shortly via CALL_SESSION_CREATED
        iceCandidateBufferRef.current.push(candidateJson)
      }
    },
    onRemoteStream: (stream) => setRemoteStream(stream),
    onConnectionClosed: () => handleHangUp(),
    onIceRestartOffer: (offerSdpJson) => {
      const convId = callConvIdRef.current
      const sessionId = callSessionIdRef.current
      if (convId && sessionId) {
        sendIceCandidate(convId, sessionId, offerSdpJson)
      }
    },
  })

  // ── Incoming call events ──────────────────────────────────────────────────
  const handleCallEvent = useCallback(async (event: CallEvent) => {
    switch (event.eventType) {
      case 'CALL_SESSION_CREATED':
        // Ack from server: we now have the sessionId for the outgoing call
        setCallSessionId(event.callSessionId)
        break

      case 'INCOMING_CALL':
        receiveIncomingCall(event)
        break

      case 'CALL_ANSWERED':
        // We are the caller — apply the answer SDP
        if (event.payload) {
          await setRemoteAnswer(event.payload)
        }
        callAnswered(event)
        break

      case 'ICE_CANDIDATE':
        if (event.payload) await addIceCandidate(event.payload)
        break

      case 'CALL_ENDED':
        cleanupWebRTC()
        setRemoteStream(null)
        endCallInStore()
        break

      case 'CALL_BUSY':
        // Remote party is already on another call
        cleanupWebRTC()
        callBusy(event.payload ?? 'On another call')
        // Auto-dismiss busy state after 4 seconds
        setTimeout(() => endCallInStore(), 4000)
        break
    }
  }, [setCallSessionId, receiveIncomingCall, callAnswered, setRemoteAnswer, addIceCandidate, cleanupWebRTC, endCallInStore, callBusy])



  const {
    subscribeToRoom, sendMessage, sendTyping, sendDM,
    editMessage, deleteMessage, reactToMessage,
    editDMMessage, deleteDMMessage, reactToDMMessage,
    sendCallOffer, sendCallAnswer, sendIceCandidate, sendCallEnd, sendCallCancel,
    sendThreadReply, markDMRead,
    connected,
  } = useWebSocket(token, handleCallEvent)

  // Flush buffered ICE candidates once the session ID is confirmed
  useEffect(() => {
    if (!callSessionId || !callConvId) return
    const buffer = iceCandidateBufferRef.current
    if (!buffer.length) return
    iceCandidateBufferRef.current = []
    buffer.forEach((c) => sendIceCandidate(callConvId, callSessionId, c))
  }, [callSessionId, callConvId, sendIceCandidate])

  // Clear buffer when a call fully ends
  useEffect(() => {
    if (callState === 'idle') iceCandidateBufferRef.current = []
  }, [callState])

  const [apiError, setApiError] = useState<string | null>(null)
  const [showCallHistory, setShowCallHistory] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [discoverOpen, setDiscoverOpen] = useState(false)
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false)
  const [viewingUser, setViewingUser] = useState<string | null>(null)
  const [roomSettingsOpen, setRoomSettingsOpen] = useState(false)
  // Mobile: show sidebar or chat panel
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true)
  // Phase 27: Thread panel
  const [threadRootMessage, setThreadRootMessage] = useState<Message | null>(null)

  useEffect(() => {
    const load = async () => {
      const results = await Promise.allSettled([
        fetchMyRooms(), fetchAllRooms(), fetchConversations(), fetchOnlineUsers(),
      ])
      if (results.some((r) => r.status === 'rejected')) {
        setApiError('Could not connect to server. Make sure the backend is running on port 8080.')
      }
    }
    load()
  }, [fetchMyRooms, fetchAllRooms, fetchConversations, fetchOnlineUsers])

  // Auto-select first room when rooms load and nothing is selected
  useEffect(() => {
    if (!activeRoomId && !activeDMId && myRooms.length > 0) {
      setActiveRoom(myRooms[0].roomId)
    }
  }, [myRooms, activeRoomId, activeDMId, setActiveRoom])

  // Reset unread badge when entering a room
  useEffect(() => {
    if (activeRoomId) resetUnread(activeRoomId)
  }, [activeRoomId, resetUnread])

  // Reset DM unread badge when entering a DM conversation
  useEffect(() => {
    if (activeDMId) resetDMUnread(activeDMId)
  }, [activeDMId, resetDMUnread])

  // Global Ctrl+K / Cmd+K handler for quick switcher
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setQuickSwitcherOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Phase 26: Update browser tab title with total unread count
  const totalRoomUnread = useChatStore((s) => Object.values(s.unreadCounts).reduce((a, b) => a + b, 0))
  const totalDMUnread = useDMStore((s) => Object.values(s.dmUnreadCounts).reduce((a, b) => a + b, 0))
  useEffect(() => {
    // Don't override the call ring flash title
    if (callState === 'ringing_incoming') return
    const total = totalRoomUnread + totalDMUnread
    document.title = total > 0 ? `(${total}) Baaat` : 'Baaat'
    return () => { document.title = 'Baaat' }
  }, [totalRoomUnread, totalDMUnread, callState])

  const activeRoom = myRooms.find((r) => r.roomId === activeRoomId)
    ?? rooms.find((r) => r.roomId === activeRoomId)
  const activeConversation = conversations.find((c) => c.id === activeDMId)

  const handleSendRoomMessage = (content: string, fileUrl?: string, messageType?: string, replyTo?: Message | null) => {
    if (activeRoomId) sendMessage(
      activeRoomId, content, fileUrl, messageType,
      replyTo?.id,
      replyTo ? replyTo.content.substring(0, 80) : undefined,
      replyTo?.senderName,
    )
  }
  const handleTyping = (typing: boolean) => {
    if (activeRoomId) sendTyping(activeRoomId, typing)
  }
  const handleSubscribeToRoom = () => {
    if (activeRoomId) subscribeToRoom(activeRoomId)
  }
  const handleLeaveRoom = async () => {
    if (activeRoomId) { await leaveRoom(activeRoomId); setActiveRoom(null); setMobileSidebarOpen(true) }
  }
  const handleSendDM = (content: string, fileUrl?: string, messageType?: string, replyTo?: Message | null) => {
    if (activeDMId) sendDM(
      activeDMId, content, fileUrl, messageType,
      replyTo?.id,
      replyTo ? replyTo.content.substring(0, 80) : undefined,
      replyTo?.senderName,
    )
  }
  const handleEditMessage = (messageId: string, newContent: string) => {
    if (activeRoomId) editMessage(activeRoomId, messageId, newContent)
  }
  const handleDeleteMessage = (messageId: string) => {
    if (activeRoomId) deleteMessage(activeRoomId, messageId)
  }
  const handleReactMessage = (messageId: string, emoji: string) => {
    if (activeRoomId) reactToMessage(activeRoomId, messageId, emoji)
  }
  const handleDMEditMessage = (messageId: string, newContent: string) => {
    if (activeDMId) editDMMessage(activeDMId, messageId, newContent)
  }
  const handleDMDeleteMessage = (messageId: string) => {
    if (activeDMId) deleteDMMessage(activeDMId, messageId)
  }
  const handleDMReactMessage = (messageId: string, emoji: string) => {
    if (activeDMId) reactToDMMessage(activeDMId, messageId, emoji)
  }
  const handleKickMember = async (username: string) => {
    if (activeRoomId) await kickMember(activeRoomId, username)
  }
  const handlePinMessage = async (messageId: string) => {
    if (activeRoomId) await pinMessage(activeRoomId, messageId)
  }
  const handleUnpinMessage = async (messageId: string) => {
    if (activeRoomId) await unpinMessage(activeRoomId, messageId)
  }
  const handleJoinRoom = async (roomId: string) => {
    await joinRoom(roomId)
    setActiveRoom(roomId)
    setDiscoverOpen(false)
  }

  // ── Call handlers ─────────────────────────────────────────────────────────

  const handleInitiateCall = useCallback(async (conversationId: string, otherUsername: string, type: CallType) => {
    if (callState !== 'idle') return
    startOutgoingCall(conversationId, otherUsername, type)
    try {
      const sdpOffer = await startWebRTCCall(type === 'VIDEO')
      sendCallOffer(conversationId, type, sdpOffer)
    } catch {
      endCallInStore()
    }
  }, [callState, startOutgoingCall, startWebRTCCall, sendCallOffer, endCallInStore])

  const handleAcceptCall = useCallback(async () => {
    if (callState !== 'ringing_incoming' || !callSessionId || !callConvId || !pendingSdp || !callType) return
    try {
      const sdpAnswer = await answerWebRTCCall(pendingSdp, callType === 'VIDEO')
      sendCallAnswer(callConvId, callSessionId, sdpAnswer)
      callAnswered({ eventType: 'CALL_ANSWERED', callSessionId, conversationId: callConvId, fromUsername: user?.username ?? '', callType, payload: sdpAnswer })
    } catch {
      // If media acquisition fails, end the call
      if (callSessionId && callConvId) sendCallEnd(callConvId, callSessionId)
      cleanupWebRTC()
      endCallInStore()
    }
  }, [callState, callSessionId, callConvId, pendingSdp, callType, answerWebRTCCall, sendCallAnswer, callAnswered, user, sendCallEnd, cleanupWebRTC, endCallInStore])

  const handleDeclineCall = useCallback(() => {
    if (callSessionId && callConvId) sendCallEnd(callConvId, callSessionId)
    cleanupWebRTC()
    endCallInStore()
  }, [callSessionId, callConvId, sendCallEnd, cleanupWebRTC, endCallInStore])

  const handleHangUp = useCallback(() => {
    if (callConvId) {
      if (callSessionId) {
        sendCallEnd(callConvId, callSessionId)
      } else {
        // Session ID not yet received (caller cancelled before CALL_SESSION_CREATED ack arrived)
        sendCallCancel(callConvId)
      }
    }
    cleanupWebRTC()
    setRemoteStream(null)
    endCallInStore()
    // Refresh call history for this conversation
    if (callConvId) fetchCallHistory(callConvId)
  }, [callSessionId, callConvId, sendCallEnd, sendCallCancel, cleanupWebRTC, setRemoteStream, endCallInStore, fetchCallHistory])

  const showRoom = activeRoom && user && !activeDMId
  const showDM = activeConversation && user && activeDMId

  const hasActiveChat = !!(showRoom || showDM)

  return (
    <div className="flex h-screen w-full bg-gray-100">
      {/* WebSocket connecting indicator — fixed overlay so it never displaces content */}
      {!connected && !apiError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/18 backdrop-blur-[2px]">
          <div className="relative overflow-hidden rounded-[28px] border border-white/50 bg-white/88 px-10 py-9 shadow-[0_24px_80px_rgba(15,23,42,0.22)] backdrop-blur-xl">
            <div className="absolute inset-x-8 top-0 h-20 rounded-full bg-gradient-to-r from-emerald-200/50 via-cyan-200/40 to-blue-200/50 blur-2xl" />
            <div className="relative flex flex-col items-center text-center">
              <BrandLogo size="lg" stacked className="mb-1" />
              <p className="mt-2 text-sm font-medium text-slate-600">Reconnecting your conversations</p>
              <div className="mt-5 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-cyan-600 animate-pulse [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar: always visible on md+, shown/hidden on mobile */}
      <div className={`
        ${mobileSidebarOpen ? 'flex' : 'hidden'}
        md:flex flex-shrink-0
        w-full md:w-80
        absolute md:relative inset-0 z-20 md:z-auto
      `}>
        <Sidebar
          onSelectChat={() => setMobileSidebarOpen(false)}
          onGlobalSearchNavigate={(msg) => {
            // Navigate to the conversation containing the found message
            if (msg.roomId.startsWith('dm:')) {
              const convId = msg.roomId.slice(3)
              setActiveDM(convId)
              setActiveRoom(null)
            } else {
              setActiveRoom(msg.roomId)
              setActiveDM(null)
            }
            setMobileSidebarOpen(false)
          }}
        />
      </div>

      {/* Chat panel: always visible on md+, shown when chat selected on mobile */}
      <main className={`
        ${!mobileSidebarOpen || !hasActiveChat ? 'flex' : 'hidden'}
        md:flex flex-1 min-w-0
        w-full
      `}>
        {/* API Error Banner */}
        {apiError && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center gap-3" role="alert" aria-live="assertive">
            <span className="text-red-500 text-lg">⚠️</span>
            <p className="text-sm text-red-700 flex-1">{apiError}</p>
            <button
              onClick={() => setApiError(null)}
              className="text-red-400 hover:text-red-600 text-sm"
            >
              Dismiss
            </button>
          </div>
        )}


        <div className="flex flex-1 flex-col min-w-0 w-full">
        {showRoom ? (
          <ChatView
            room={activeRoom}
            currentUsername={user.username}
            onSendMessage={handleSendRoomMessage}
            onTyping={handleTyping}
            onSubscribe={handleSubscribeToRoom}
            onLeave={handleLeaveRoom}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onReactMessage={handleReactMessage}
            onViewProfile={setViewingUser}
            onBack={() => setMobileSidebarOpen(true)}
            onKickMember={handleKickMember}
            onOpenSettings={() => setRoomSettingsOpen(true)}
            onPinMessage={handlePinMessage}
            onUnpinMessage={handleUnpinMessage}
            onOpenThread={setThreadRootMessage}
          />
        ) : showDM ? (
          <DMChatView
            conversation={activeConversation}
            currentUsername={user.username}
            onSend={handleSendDM}
            onMarkRead={(messageId) => markDMRead(activeConversation.id, messageId)}
            onViewProfile={setViewingUser}
            onEditMessage={handleDMEditMessage}
            onDeleteMessage={handleDMDeleteMessage}
            onReactMessage={handleDMReactMessage}
            onBack={() => setMobileSidebarOpen(true)}
            onAudioCall={() => handleInitiateCall(activeConversation.id, activeConversation.participants.find(p => p !== user.username) ?? '', 'AUDIO')}
            onVideoCall={() => handleInitiateCall(activeConversation.id, activeConversation.participants.find(p => p !== user.username) ?? '', 'VIDEO')}
            onViewCallHistory={async () => { await fetchCallHistory(activeConversation.id); setShowCallHistory(true) }}
            onCallBack={() => handleInitiateCall(activeConversation.id, activeConversation.participants.find(p => p !== user.username) ?? '', 'AUDIO')}
            onOpenThread={setThreadRootMessage}
          />
        ) : roomsLoading ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500 text-sm">Loading your rooms…</p>
            </div>
          </div>
        ) : (
          /* Welcome / Empty state */
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-cyan-50/40 p-8">
            <div className="bg-white/96 rounded-[28px] shadow-[0_20px_60px_rgba(15,23,42,0.08)] border border-slate-200/80 p-10 max-w-lg w-full text-center">
              <div className="hidden w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl items-center justify-center mx-auto mb-6 shadow-md">
                <span className="text-white text-4xl">💬</span>
              </div>
              <BrandLogo size="lg" stacked className="mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to your workspace</h2>
              <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                Connect with others in chat rooms or through direct messages.
                {myRooms.length === 0 && ' Create your first room or browse existing ones to get started.'}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setCreateOpen(true)}
                  className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50/70 hover:shadow-[0_16px_36px_rgba(20,184,166,0.12)] group"
                  data-testid="create-room-cta"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 text-2xl text-teal-700 transition-all group-hover:from-teal-500 group-hover:to-cyan-600 group-hover:text-white">
                    🏠
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">Create Room</div>
                    <div className="text-xs text-gray-400 mt-0.5">Start a group chat</div>
                  </div>
                </button>

                <button
                  onClick={() => setDiscoverOpen(true)}
                  className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50/70 hover:shadow-[0_16px_36px_rgba(8,145,178,0.12)] group"
                  data-testid="browse-rooms-cta"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-sky-100 text-2xl text-cyan-700 transition-all group-hover:from-cyan-500 group-hover:to-sky-600 group-hover:text-white">
                    🔍
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">Browse Rooms</div>
                    <div className="text-xs text-gray-400 mt-0.5">Join existing rooms</div>
                  </div>
                </button>
              </div>

              {user && (
                <p className="text-xs text-gray-400 mt-6">
                  Signed in as <span className="font-medium text-gray-600">{user.username}</span>
                </p>
              )}
            </div>
          </div>
        )}
        </div>

        {/* Phase 27: Thread panel — shown alongside chat when open */}
        {threadRootMessage && user && (
          <ThreadPanel
            rootMessage={threadRootMessage}
            currentUsername={user.username}
            onClose={() => setThreadRootMessage(null)}
            onSendReply={(rootId, content, fileUrl, messageType) => {
              sendThreadReply(rootId, content, user.username, fileUrl, messageType)
            }}
          />
        )}
      </main>

      <CreateRoomModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <Modal open={discoverOpen} onClose={() => setDiscoverOpen(false)} title="Browse Rooms">
        <div className="h-96 -mx-6 -mb-4 overflow-hidden rounded-b-xl">
          <RoomList
            rooms={rooms}
            activeRoomId={activeRoomId}
            onSelectRoom={(id) => { setActiveRoom(id); setDiscoverOpen(false) }}
            onJoinRoom={handleJoinRoom}
            showJoin
          />
        </div>
      </Modal>

      <QuickSwitcher
        open={quickSwitcherOpen}
        onClose={() => setQuickSwitcherOpen(false)}
        rooms={myRooms}
        conversations={conversations}
        currentUsername={user?.username ?? ''}
        onSelectRoom={(id) => { setActiveRoom(id); setActiveDM(null) }}
        onSelectDM={(id) => { setActiveDM(id); setActiveRoom(null) }}
        activeRoomId={activeRoomId}
        activeDMId={activeDMId}
      />

      <UserProfileModal username={viewingUser} onClose={() => setViewingUser(null)} />

      {activeRoom && (
        <RoomSettingsModal
          room={activeRoom}
          open={roomSettingsOpen}
          onClose={() => setRoomSettingsOpen(false)}
        />
      )}

      {/* ── Call UI overlays ─────────────────────────────────────────── */}

      {callState === 'ringing_incoming' && callOtherUser && callType && (
        <IncomingCallOverlay
          callerUsername={callOtherUser}
          callType={callType}
          callerAvatarUrl={cache[callOtherUser]?.avatarUrl}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
      )}

      {callState === 'ringing_outgoing' && callOtherUser && callType && (
        <OutgoingCallView
          calleeUsername={callOtherUser}
          callType={callType}
          calleeAvatarUrl={cache[callOtherUser]?.avatarUrl}
          onCancel={handleHangUp}
        />
      )}

      {callState === 'active' && callOtherUser && callType && (
        <ActiveCallView
          otherUsername={callOtherUser}
          callType={callType}
          localStream={localStream.current}
          remoteStream={remoteStream}
          otherAvatarUrl={cache[callOtherUser]?.avatarUrl}
          onHangUp={handleHangUp}
        />
      )}

      {showCallHistory && activeDMId && user && (
        <CallHistoryPanel
          sessions={callHistory[activeDMId] ?? []}
          currentUsername={user.username}
          onClose={() => setShowCallHistory(false)}
        />
      )}

      {callState === 'busy' && callOtherUser && (
        <div
          className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-3"
          data-testid="busy-signal-banner"
          role="alert"
        >
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold">{callOtherUser}</p>
            <p className="text-xs text-gray-400">{busyReason ?? 'On another call'}</p>
          </div>
        </div>
      )}
    </div>
  )
}
