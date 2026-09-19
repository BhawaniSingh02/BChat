import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { useChatStore } from '../store/chatStore';
import { useDMStore } from '../store/dmStore';
import { usePresenceStore } from '../store/presenceStore';
import { CallEvent, CallType, Message, MessageType, PresenceEvent, RoomEvent, TypingEvent } from '../types';

const DM_PREFIX = 'dm:';

export interface OutgoingMessage {
  content: string;
  fileUrl?: string;
  messageType?: MessageType;
  replyToId?: string;
  replyToSnippet?: string;
  replyToSender?: string;
  clientId?: string;
}

type ErrorListener = (detail: string) => void;
type CallEventListener = (event: CallEvent) => void;
type RoomEventListener = (event: RoomEvent) => void;

function getWsUrl(): string {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://baaat.onrender.com/api/v1';
  const wsBase = base.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '');
  return `${wsBase}/ws/websocket`;
}

class SocketManager {
  private client: Client | null = null;
  private connected = false;
  private connectListeners: Array<() => void> = [];
  private errorListeners: ErrorListener[] = [];
  private callEventListeners: CallEventListener[] = [];
  private roomEventListeners: RoomEventListener[] = [];

  connect(token: string) {
    if (this.client) return;
    this.client = new Client({
      webSocketFactory: () => new WebSocket(getWsUrl()),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      // React Native's WebSocket bridge strips the trailing NULL byte that terminates STOMP text
      // frames ("null chopping" — a long-standing, officially acknowledged RN bug, not a stompjs bug:
      // https://stomp-js.github.io/guide/stompjs/rx-stomp/react-native-additional-notes.html). Without
      // this, the connection opens and the server responds, but the client's frame parser never sees
      // a complete frame and just hangs forever. Sending binary frames avoids the string-mangling path
      // entirely, and this flag patches incoming frames that are still missing their terminator.
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      onConnect: () => {
        this.connected = true;
        this.client?.subscribe('/user/queue/errors', (frame: IMessage) => {
          try {
            const body = JSON.parse(frame.body);
            this.errorListeners.forEach((fn) => fn(body.error ?? 'Something went wrong.'));
          } catch {
            // ignore malformed error frames
          }
        });
        // DMs have no per-conversation topic — every incoming DM for this user, across
        // every conversation, arrives on this one shared queue (mirrors the web app's
        // useWebSocket.ts, which subscribes here once rather than per-conversation).
        this.client?.subscribe('/user/queue/messages', (frame: IMessage) => {
          const message: Message = JSON.parse(frame.body);
          const chatStore = useChatStore.getState();
          // Edits/deletes/reactions/read-receipts re-deliver the *same* message id on this
          // queue, same as a brand-new send. Only a genuinely new id should bump the chat
          // list's preview/order/unread count — otherwise reacting to (or someone else
          // reading) an old message would yank that conversation to the top with stale
          // content, since `message.sender` here is the original author, not the actor.
          const isNewMessage = !(chatStore.messagesByRoom[message.roomId] ?? []).some((m) => m.id === message.id);
          chatStore.upsertMessage(message);
          if (message.roomId?.startsWith(DM_PREFIX)) {
            const conversationId = message.roomId.slice(DM_PREFIX.length);
            if (useDMStore.getState().knownConversationIds().includes(conversationId)) {
              if (isNewMessage) useDMStore.getState().applyIncomingMessage(message);
            } else {
              useDMStore.getState().fetchConversations();
              useDMStore.getState().fetchRequests();
            }
          }
        });
        // DM typing has no per-conversation topic either (mirrors /user/queue/messages
        // above) — route straight into chatStore, prefixing with dm: to match the same
        // key convention used for DM messages/state everywhere else in the store.
        this.client?.subscribe('/user/queue/typing', (frame: IMessage) => {
          try {
            const event: TypingEvent = JSON.parse(frame.body);
            useChatStore.getState().setTyping(`${DM_PREFIX}${event.roomId}`, event.username, event.typing);
          } catch {
            // ignore malformed typing frames
          }
        });
        this.client?.subscribe('/topic/presence', (frame: IMessage) => {
          try {
            const event: PresenceEvent = JSON.parse(frame.body);
            if (typeof event?.username === 'string') usePresenceStore.getState().applyEvent(event);
          } catch {
            // ignore malformed presence frames
          }
        });
        // The topic above only fires on actual online/offline transitions — any that
        // happened while this socket was disconnected (network blip, app backgrounded,
        // dev-server restart) are silently missed. Re-pull the full online-user snapshot
        // on every (re)connect so presence self-heals instead of staying stale until the
        // user happens to revisit the chat list (the only other place this gets refetched).
        usePresenceStore.getState().fetchOnlineUsers();
        // Every call-signaling event (incoming call, answer, ICE candidates, hangup, busy,
        // mute) arrives on this one shared queue, dispatched by `eventType` — same shape as
        // chat-app-frontend's useWebSocket.ts.
        this.client?.subscribe('/user/queue/call', (frame: IMessage) => {
          try {
            const event: CallEvent = JSON.parse(frame.body);
            this.callEventListeners.forEach((fn) => fn(event));
          } catch {
            // ignore malformed call frames
          }
        });
        // Room membership/detail changes (kick, leave, join, edit) — delivered to this
        // personal queue rather than /topic/room/{roomId} so they reach the app even when
        // the affected conversation screen isn't currently open.
        this.client?.subscribe('/user/queue/room-events', (frame: IMessage) => {
          try {
            const event: RoomEvent = JSON.parse(frame.body);
            this.roomEventListeners.forEach((fn) => fn(event));
          } catch {
            // ignore malformed room-event frames
          }
        });
        const pending = this.connectListeners;
        this.connectListeners = [];
        pending.forEach((fn) => fn());
      },
      onDisconnect: () => {
        this.connected = false;
      },
      onWebSocketClose: () => {
        this.connected = false;
      },
    });
    this.client.activate();
  }

  disconnect() {
    this.client?.deactivate();
    this.client = null;
    this.connected = false;
    this.connectListeners = [];
  }

  onError(listener: ErrorListener): () => void {
    this.errorListeners.push(listener);
    return () => {
      this.errorListeners = this.errorListeners.filter((fn) => fn !== listener);
    };
  }

  onCallEvent(listener: CallEventListener): () => void {
    this.callEventListeners.push(listener);
    return () => {
      this.callEventListeners = this.callEventListeners.filter((fn) => fn !== listener);
    };
  }

  onRoomEvent(listener: RoomEventListener): () => void {
    this.roomEventListeners.push(listener);
    return () => {
      this.roomEventListeners = this.roomEventListeners.filter((fn) => fn !== listener);
    };
  }

  private whenConnected(fn: () => void) {
    if (this.connected) fn();
    else this.connectListeners.push(fn);
  }

  subscribeRoom(roomId: string, onMessage: (msg: Message) => void): () => void {
    const subs: StompSubscription[] = [];
    let cancelled = false;
    this.whenConnected(() => {
      if (cancelled || !this.client) return;
      // New messages, and edits/deletes/reactions (the backend re-broadcasts the full
      // updated message on this same topic for all three).
      subs.push(
        this.client.subscribe(`/topic/room/${roomId}`, (frame: IMessage) => {
          onMessage(JSON.parse(frame.body));
        }),
      );
      // Read receipts arrive as a full updated message too, just on a separate sub-topic.
      subs.push(
        this.client.subscribe(`/topic/room/${roomId}/read`, (frame: IMessage) => {
          onMessage(JSON.parse(frame.body));
        }),
      );
      subs.push(
        this.client.subscribe(`/topic/room/${roomId}/typing`, (frame: IMessage) => {
          try {
            const event: TypingEvent = JSON.parse(frame.body);
            useChatStore.getState().setTyping(roomId, event.username, event.typing);
          } catch {
            // ignore malformed typing frames
          }
        }),
      );
    });
    return () => {
      cancelled = true;
      subs.forEach((sub) => sub.unsubscribe());
    };
  }

  sendRoomMessage(roomId: string, content: string) {
    this.sendRoomPayload(roomId, { content, messageType: 'TEXT' });
  }

  sendRoomPayload(roomId: string, payload: OutgoingMessage) {
    this.whenConnected(() => {
      this.client?.publish({
        destination: `/app/chat.sendMessage/${roomId}`,
        body: JSON.stringify(payload),
      });
    });
  }

  sendDMMessage(conversationId: string, payload: OutgoingMessage) {
    this.whenConnected(() => {
      this.client?.publish({
        destination: `/app/dm.send/${conversationId}`,
        body: JSON.stringify(payload),
      });
    });
  }

  // ── Typing, read receipts, edit/delete/react ────────────────────────────

  sendTyping(roomId: string, typing: boolean) {
    this.whenConnected(() => {
      this.client?.publish({ destination: `/app/chat.typing/${roomId}`, body: JSON.stringify({ typing }) });
    });
  }

  sendDMTyping(conversationId: string, typing: boolean) {
    this.whenConnected(() => {
      this.client?.publish({ destination: `/app/dm.typing/${conversationId}`, body: JSON.stringify({ typing }) });
    });
  }

  sendReadReceipt(roomId: string, messageId: string) {
    this.whenConnected(() => {
      this.client?.publish({ destination: `/app/chat.read/${roomId}`, body: JSON.stringify({ messageId }) });
    });
  }

  sendDMReadReceipt(conversationId: string, messageId: string) {
    this.whenConnected(() => {
      this.client?.publish({ destination: `/app/dm.read/${conversationId}`, body: JSON.stringify({ messageId }) });
    });
  }

  editRoomMessage(roomId: string, messageId: string, content: string) {
    this.whenConnected(() => {
      this.client?.publish({ destination: `/app/chat.editMessage/${roomId}`, body: JSON.stringify({ messageId, content }) });
    });
  }

  deleteRoomMessage(roomId: string, messageId: string) {
    this.whenConnected(() => {
      this.client?.publish({ destination: `/app/chat.deleteMessage/${roomId}`, body: JSON.stringify({ messageId }) });
    });
  }

  reactToRoomMessage(roomId: string, messageId: string, emoji: string) {
    this.whenConnected(() => {
      this.client?.publish({ destination: `/app/chat.react/${roomId}`, body: JSON.stringify({ messageId, emoji }) });
    });
  }

  editDMMessage(conversationId: string, messageId: string, content: string) {
    this.whenConnected(() => {
      this.client?.publish({ destination: `/app/dm.edit/${conversationId}`, body: JSON.stringify({ messageId, content }) });
    });
  }

  deleteDMMessage(conversationId: string, messageId: string) {
    this.whenConnected(() => {
      this.client?.publish({ destination: `/app/dm.delete/${conversationId}`, body: JSON.stringify({ messageId }) });
    });
  }

  reactToDMMessage(conversationId: string, messageId: string, emoji: string) {
    this.whenConnected(() => {
      this.client?.publish({ destination: `/app/dm.react/${conversationId}`, body: JSON.stringify({ messageId, emoji }) });
    });
  }

  // ── Call signaling ──────────────────────────────────────────────────────

  sendCallOffer(conversationId: string, callType: CallType, sdpOffer: string) {
    this.whenConnected(() => {
      this.client?.publish({
        destination: `/app/call.offer/${conversationId}`,
        body: JSON.stringify({ callType, payload: sdpOffer }),
      });
    });
  }

  sendCallAnswer(conversationId: string, callSessionId: string, sdpAnswer: string) {
    this.whenConnected(() => {
      this.client?.publish({
        destination: `/app/call.answer/${conversationId}/${callSessionId}`,
        body: JSON.stringify({ payload: sdpAnswer }),
      });
    });
  }

  sendIceCandidate(conversationId: string, callSessionId: string, candidatePayload: string) {
    this.whenConnected(() => {
      this.client?.publish({
        destination: `/app/call.ice/${conversationId}/${callSessionId}`,
        body: JSON.stringify({ payload: candidatePayload }),
      });
    });
  }

  sendCallEnd(conversationId: string, callSessionId: string) {
    this.whenConnected(() => {
      this.client?.publish({
        destination: `/app/call.end/${conversationId}/${callSessionId}`,
        body: JSON.stringify({}),
      });
    });
  }

  sendCallCancel(conversationId: string) {
    this.whenConnected(() => {
      this.client?.publish({
        destination: `/app/call.cancel/${conversationId}`,
        body: JSON.stringify({}),
      });
    });
  }

  sendCallMuteStatus(conversationId: string, callSessionId: string, kind: 'audio' | 'video', muted: boolean) {
    this.whenConnected(() => {
      this.client?.publish({
        destination: `/app/call.mute/${conversationId}/${callSessionId}`,
        body: JSON.stringify({ payload: JSON.stringify({ kind, muted }) }),
      });
    });
  }
}

export const socketManager = new SocketManager();
