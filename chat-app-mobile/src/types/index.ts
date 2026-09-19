export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO' | 'AUDIO';

export interface Message {
  id: string;
  roomId: string;
  sender: string;
  senderName: string;
  clientId?: string;
  content: string;
  messageType: MessageType;
  fileUrl?: string;
  readBy: string[];
  readAt?: Record<string, string>;
  timestamp: string;
  edited?: boolean;
  editedAt?: string;
  deleted?: boolean;
  reactions?: Record<string, string[]>;
  replyToId?: string;
  replyToSnippet?: string;
  replyToSender?: string;
  forwardedFrom?: string;
  starred?: string[];
  /** Local-only optimistic-send state — absent/'sent' for a normal persisted message. */
  status?: 'sending' | 'sent' | 'failed';
  // Voice message polish — AUDIO messages only
  durationSeconds?: number;
  waveform?: number[];
}

export interface Room {
  id: string;
  roomId: string;
  name: string;
  description?: string;
  createdBy: string;
  members: string[];
  memberCount: number;
  createdAt: string;
  lastMessageAt?: string;
  pinnedMessages?: string[];
  mutedBy?: Record<string, string>;
}

export type RoomEventType = 'UPDATED' | 'MEMBER_REMOVED' | 'MEMBER_LEFT' | 'MEMBER_JOINED';

export interface RoomEvent {
  eventType: RoomEventType;
  roomId: string;
  room?: Room;
  affectedUsername?: string;
}

export interface CursorPage<T> {
  content: T[];
  nextCursor: number | null;
  hasMore: boolean;
}

export interface DirectConversation {
  id: string;
  participants: string[];
  createdAt: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  lastMessageType?: MessageType;
  lastMessageSender?: string;
  mutedBy?: Record<string, string>;
  archivedBy?: string[];
  status?: 'ACCEPTED' | 'PENDING';
  initiatedBy?: string;
}

export interface UserSummary {
  id: string;
  username: string;
  displayName?: string;
  uniqueHandle: string;
  avatarUrl?: string;
  whoCanMessage?: string;
  lastSeen?: string;
  lastSeenPrivacy?: string;
  onlinePrivacy?: string;
  bio?: string;
  statusMessage?: string;
  createdAt?: string;
}

export interface PresenceEvent {
  username: string;
  online: boolean;
}

export interface TypingEvent {
  roomId: string;
  username: string;
  typing: boolean;
}

export type CallType = 'AUDIO' | 'VIDEO';
export type CallStatus = 'RINGING' | 'ACTIVE' | 'ENDED' | 'MISSED' | 'REJECTED';

export type CallEventType =
  | 'CALL_SESSION_CREATED'
  | 'INCOMING_CALL'
  | 'CALL_ANSWERED'
  | 'ICE_CANDIDATE'
  | 'CALL_ENDED'
  | 'CALL_BUSY'
  | 'MUTE_STATUS';

export interface CallEvent {
  eventType: CallEventType;
  callSessionId: string;
  conversationId: string;
  fromUsername: string;
  callType: CallType;
  payload?: string | null;
}

export interface CallSession {
  id: string;
  conversationId: string;
  callerId: string;
  calleeId: string;
  callType: CallType;
  status: CallStatus;
  startedAt: string;
  answeredAt?: string;
  endedAt?: string;
  durationSeconds: number;
}

export type CallState = 'idle' | 'ringing_outgoing' | 'ringing_incoming' | 'active' | 'busy';

// Stories (24h ephemeral status)
export type StoryType = 'TEXT' | 'IMAGE' | 'VIDEO';

export interface Story {
  id: string;
  authorId: string;
  type: StoryType;
  content?: string;
  mediaUrl?: string;
  backgroundColor?: string;
  createdAt: string;
  expiresAt: string;
  viewedByMe: boolean;
  viewerCount: number;
  reactions: Record<string, number>;
  myReaction: string | null;
}

export interface StoryGroup {
  authorId: string;
  stories: Story[];
  hasUnviewed: boolean;
  lastStoryAt: string;
}

export interface CreateStoryRequest {
  type: StoryType;
  content?: string;
  mediaUrl?: string;
  backgroundColor?: string;
}
