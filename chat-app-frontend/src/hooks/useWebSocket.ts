import { useEffect, useRef, useCallback, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import type { Message, PresenceEvent, TypingEvent } from '../types'

/** Runtime guard — ensures WS frame body contains the minimum fields of a Message */
function isValidMessage(value: unknown): value is Message {
  if (!value || typeof value !== 'object') return false
  const m = value as Record<string, unknown>
  return typeof m.id === 'string' && typeof m.roomId === 'string' && typeof m.sender === 'string'
}

function parseMessage(body: string): Message | null {
  try {
    const parsed: unknown = JSON.parse(body)
    return isValidMessage(parsed) ? parsed : null
  } catch {
    return null
  }
}
import { useChatStore } from '../store/chatStore'
import { useRoomStore } from '../store/roomStore'
import { usePresenceStore } from '../store/presenceStore'
import { useDMStore } from '../store/dmStore'
import { useNotificationStore } from '../store/notificationStore'
import { useAuthStore } from '../store/authStore'
import type { CallEvent } from '../types'

const WS_URL = import.meta.env.VITE_WS_URL ?? '/ws'

function notifyDesktop(title: string, body: string, chatId?: string) {
  if (!window.electronAPI) return
  window.electronAPI.notify({ title, body, chatId })
}

export function useWebSocket(token: string | null, onCallEvent?: (event: CallEvent) => void) {
  const clientRef = useRef<Client | null>(null)
  const subscribedRooms = useRef<Set<string>>(new Set())

  const upsertRoomMessage = useChatStore((s) => s.upsertMessage)
  const roomMessages = useChatStore((s) => s.messages)
  const setTyping = useChatStore((s) => s.setTyping)
  const updateReadBy = useChatStore((s) => s.updateReadBy)
  const incrementUnread = useChatStore((s) => s.incrementUnread)
  const updateRoomLastMessage = useRoomStore((s) => s.updateRoomLastMessage)
  const activeRoomId = useRoomStore((s) => s.activeRoomId)
  const allRooms = useRoomStore((s) => s.rooms)
  const myRooms = useRoomStore((s) => s.myRooms)
  const applyPresenceEvent = usePresenceStore((s) => s.applyEvent)
  const upsertDMMessage = useDMStore((s) => s.upsertDMMessage)
  const dmMessages = useDMStore((s) => s.messages)
  const incrementDMUnread = useDMStore((s) => s.incrementDMUnread)
  const activeDMId = useDMStore((s) => s.activeDMId)
  const conversations = useDMStore((s) => s.conversations)
  const addNotification = useNotificationStore((s) => s.addNotification)
  const currentUsername = useAuthStore((s) => s.user?.username)

  const [connected, setConnected] = useState(false)
  const activeRoomIdRef = useRef<string | null>(null)
  const activeDMIdRef = useRef<string | null>(null)
  const onCallEventRef = useRef(onCallEvent)
  const roomMessagesRef = useRef(roomMessages)
  const dmMessagesRef = useRef(dmMessages)
  const roomsRef = useRef(allRooms)
  const myRoomsRef = useRef(myRooms)
  const conversationsRef = useRef(conversations)
  const currentUsernameRef = useRef(currentUsername)

  useEffect(() => {
    onCallEventRef.current = onCallEvent
  }, [onCallEvent])

  useEffect(() => {
    activeRoomIdRef.current = activeRoomId
  }, [activeRoomId])

  useEffect(() => {
    activeDMIdRef.current = activeDMId
  }, [activeDMId])

  useEffect(() => {
    roomMessagesRef.current = roomMessages
  }, [roomMessages])

  useEffect(() => {
    dmMessagesRef.current = dmMessages
  }, [dmMessages])

  useEffect(() => {
    roomsRef.current = allRooms
  }, [allRooms])

  useEffect(() => {
    myRoomsRef.current = myRooms
  }, [myRooms])

  useEffect(() => {
    conversationsRef.current = conversations
  }, [conversations])

  useEffect(() => {
    currentUsernameRef.current = currentUsername
  }, [currentUsername])

  useEffect(() => {
    if (!token) return

    const stompClient = new Client({
      webSocketFactory: () => new SockJS(WS_URL) as WebSocket,
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        setConnected(true)

        // User-specific DM delivery — handles new messages, edits, deletes and reactions
        stompClient.subscribe('/user/queue/messages', (frame) => {
          const message = parseMessage(frame.body)
          if (!message) { console.warn('Invalid DM message frame received:', frame.body); return }
          const conversationId = message.roomId.startsWith('dm:') ? message.roomId.slice(3) : null
          const alreadyExists = conversationId
            ? (dmMessagesRef.current[conversationId] ?? []).some((m) => m.id === message.id)
            : false
          upsertDMMessage(message)
          // Only increment unread for brand-new messages (not edits/deletes/reactions)
          if (message.roomId.startsWith('dm:') && !message.edited && !message.deleted) {
            if (conversationId && conversationId !== activeDMIdRef.current) {
              incrementDMUnread(conversationId)
            }
            if (
              conversationId &&
              !alreadyExists &&
              message.sender !== currentUsernameRef.current &&
              conversationId !== activeDMIdRef.current
            ) {
              const conversation = conversationsRef.current.find((c) => c.id === conversationId)
              const otherUser = conversation?.participants.find((p) => p !== currentUsernameRef.current) ?? message.senderName ?? message.sender
              addNotification(message, otherUser)
              notifyDesktop(otherUser, message.content || 'You have a new message', conversationId)
            }
          }
        })

        // Call signaling events
        stompClient.subscribe('/user/queue/call', (frame) => {
          try {
            const event: CallEvent = JSON.parse(frame.body)
            if (event?.eventType === 'INCOMING_CALL' && event.fromUsername) {
              const label = event.callType === 'VIDEO' ? 'video' : 'audio'
              notifyDesktop(
                'Incoming call',
                `${event.fromUsername} is calling you (${label})`,
                event.conversationId,
              )
            }
            if (event?.eventType && onCallEventRef.current) {
              onCallEventRef.current(event)
            }
          } catch { /* ignore malformed call frames */ }
        })

        // Global presence updates
        stompClient.subscribe('/topic/presence', (frame) => {
          try {
            const event: PresenceEvent = JSON.parse(frame.body)
            if (typeof event?.username === 'string') applyPresenceEvent(event)
          } catch { /* ignore malformed presence frames */ }
        })
      },
      onDisconnect: () => {
        setConnected(false)
      },
      onStompError: (frame) => {
        setConnected(false)
        console.error('STOMP error:', frame)
      },
      reconnectDelay: 5000,
    })

    stompClient.activate()
    clientRef.current = stompClient

    return () => {
      stompClient.deactivate()
      clientRef.current = null
      subscribedRooms.current.clear()
      setConnected(false)
    }
  }, [token])

  const subscribeToRoom = useCallback((roomId: string) => {
    const client = clientRef.current
    if (!client?.connected || subscribedRooms.current.has(roomId)) return

    subscribedRooms.current.add(roomId)

    client.subscribe(`/topic/room/${roomId}`, (frame) => {
      const message = parseMessage(frame.body)
      if (!message) { console.warn('Invalid room message frame received:', frame.body); return }
      const alreadyExists = (roomMessagesRef.current[message.roomId] ?? []).some((m) => m.id === message.id)
      upsertRoomMessage(message)
      if (!message.deleted) updateRoomLastMessage(roomId, message.timestamp)
      if (message.roomId !== activeRoomIdRef.current) {
        incrementUnread(message.roomId)
      }
      if (
        !alreadyExists &&
        !message.edited &&
        !message.deleted &&
        message.sender !== currentUsernameRef.current &&
        message.roomId !== activeRoomIdRef.current
      ) {
        const room = myRoomsRef.current.find((r) => r.roomId === message.roomId)
          ?? roomsRef.current.find((r) => r.roomId === message.roomId)
        addNotification(message, room ? `#${room.name}` : '#Room')
        notifyDesktop(
          room ? `#${room.name}` : 'Room message',
          `${message.senderName ?? message.sender}: ${message.content || 'sent a message'}`,
          message.roomId,
        )
      }
    })

    client.subscribe(`/topic/room/${roomId}/typing`, (frame) => {
      const event: TypingEvent = JSON.parse(frame.body)
      setTyping(roomId, event.username, event.typing)
    })

    client.subscribe(`/topic/room/${roomId}/read`, (frame) => {
      const message = parseMessage(frame.body)
      if (message) updateReadBy(message)
    })
  }, [upsertRoomMessage, setTyping, updateReadBy, updateRoomLastMessage, incrementUnread])

  const sendMessage = useCallback((
    roomId: string,
    content: string,
    fileUrl?: string,
    messageType = 'TEXT',
    replyToId?: string,
    replyToSnippet?: string,
    replyToSender?: string,
    forwardedFrom?: string,
  ) => {
    clientRef.current?.publish({
      destination: `/app/chat.sendMessage/${roomId}`,
      body: JSON.stringify({ content, fileUrl, messageType, replyToId, replyToSnippet, replyToSender, forwardedFrom }),
    })
  }, [])

  const sendTyping = useCallback((roomId: string, typing: boolean) => {
    clientRef.current?.publish({
      destination: `/app/chat.typing/${roomId}`,
      body: JSON.stringify({ typing }),
    })
  }, [])

  const markRead = useCallback((roomId: string, messageId: string) => {
    clientRef.current?.publish({
      destination: `/app/chat.read/${roomId}`,
      body: JSON.stringify({ messageId }),
    })
  }, [])

  const sendDM = useCallback((
    conversationId: string,
    content: string,
    fileUrl?: string,
    messageType = 'TEXT',
    replyToId?: string,
    replyToSnippet?: string,
    replyToSender?: string,
    forwardedFrom?: string,
  ) => {
    clientRef.current?.publish({
      destination: `/app/dm.send/${conversationId}`,
      body: JSON.stringify({ content, fileUrl, messageType, replyToId, replyToSnippet, replyToSender, forwardedFrom }),
    })
  }, [])

  const editMessage = useCallback((roomId: string, messageId: string, content: string) => {
    clientRef.current?.publish({
      destination: `/app/chat.editMessage/${roomId}`,
      body: JSON.stringify({ messageId, content }),
    })
  }, [])

  const deleteMessage = useCallback((roomId: string, messageId: string) => {
    clientRef.current?.publish({
      destination: `/app/chat.deleteMessage/${roomId}`,
      body: JSON.stringify({ messageId }),
    })
  }, [])

  const reactToMessage = useCallback((roomId: string, messageId: string, emoji: string) => {
    clientRef.current?.publish({
      destination: `/app/chat.react/${roomId}`,
      body: JSON.stringify({ messageId, emoji }),
    })
  }, [])

  const editDMMessage = useCallback((conversationId: string, messageId: string, content: string) => {
    clientRef.current?.publish({
      destination: `/app/dm.edit/${conversationId}`,
      body: JSON.stringify({ messageId, content }),
    })
  }, [])

  const deleteDMMessage = useCallback((conversationId: string, messageId: string) => {
    clientRef.current?.publish({
      destination: `/app/dm.delete/${conversationId}`,
      body: JSON.stringify({ messageId }),
    })
  }, [])

  const reactToDMMessage = useCallback((conversationId: string, messageId: string, emoji: string) => {
    clientRef.current?.publish({
      destination: `/app/dm.react/${conversationId}`,
      body: JSON.stringify({ messageId, emoji }),
    })
  }, [])

  const isConnected = useCallback(() => clientRef.current?.connected ?? false, [])

  // ── Call signaling ───────────────────────────────────────────────────────

  const sendCallOffer = useCallback((conversationId: string, callType: string, sdpPayload: string) => {
    clientRef.current?.publish({
      destination: `/app/call.offer/${conversationId}`,
      body: JSON.stringify({ callType, payload: sdpPayload }),
    })
  }, [])

  const sendCallAnswer = useCallback((conversationId: string, callSessionId: string, sdpPayload: string) => {
    clientRef.current?.publish({
      destination: `/app/call.answer/${conversationId}/${callSessionId}`,
      body: JSON.stringify({ payload: sdpPayload }),
    })
  }, [])

  const sendIceCandidate = useCallback((conversationId: string, callSessionId: string, candidatePayload: string) => {
    clientRef.current?.publish({
      destination: `/app/call.ice/${conversationId}/${callSessionId}`,
      body: JSON.stringify({ payload: candidatePayload }),
    })
  }, [])

  const sendCallEnd = useCallback((conversationId: string, callSessionId: string) => {
    clientRef.current?.publish({
      destination: `/app/call.end/${conversationId}/${callSessionId}`,
      body: JSON.stringify({}),
    })
  }, [])

  /** Cancel a ringing call by conversationId only — used when sessionId is not yet known. */
  const sendCallCancel = useCallback((conversationId: string) => {
    clientRef.current?.publish({
      destination: `/app/call.cancel/${conversationId}`,
      body: JSON.stringify({}),
    })
  }, [])

  // ── Phase 27: Thread replies ─────────────────────────────────────────────

  /** Subscribe to live thread reply updates for a root message. */
  const subscribeToThread = useCallback((rootMessageId: string, onReply: (msg: Message) => void) => {
    const client = clientRef.current
    if (!client?.connected) return () => {}
    const sub = client.subscribe(`/topic/thread/${rootMessageId}`, (frame) => {
      const message = parseMessage(frame.body)
      if (message) onReply(message)
    })
    return () => sub.unsubscribe()
  }, [])

  /** Send a threaded reply via STOMP. */
  const sendThreadReply = useCallback((rootMessageId: string, content: string, senderName?: string, fileUrl?: string, messageType = 'TEXT') => {
    clientRef.current?.publish({
      destination: `/app/thread.reply/${rootMessageId}`,
      body: JSON.stringify({ content, senderName, fileUrl, messageType }),
    })
  }, [])

  /** Mark a DM message as read — triggers blue ticks on the sender's side. */
  const markDMRead = useCallback((conversationId: string, messageId: string) => {
    clientRef.current?.publish({
      destination: `/app/dm.read/${conversationId}`,
      body: JSON.stringify({ messageId }),
    })
  }, [])

  return {
    subscribeToRoom, sendMessage, sendTyping, markRead, sendDM,
    editMessage, deleteMessage, reactToMessage,
    editDMMessage, deleteDMMessage, reactToDMMessage,
    sendCallOffer, sendCallAnswer, sendIceCandidate, sendCallEnd, sendCallCancel,
    subscribeToThread, sendThreadReply,
    markDMRead,
    isConnected, connected,
  }
}
