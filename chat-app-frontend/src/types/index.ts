export interface User {
  id: string
  username: string        // = uniqueHandle for verified users
  email: string
  displayName?: string
  uniqueHandle?: string
  whoCanMessage?: 'ANYONE' | 'APPROVED_ONLY' | 'NOBODY'
  bio?: string
  statusMessage?: string
  avatarUrl?: string
  lastSeenPrivacy?: 'EVERYONE' | 'NOBODY' | 'CONTACTS'
  onlinePrivacy?: 'EVERYONE' | 'NOBODY'
  profilePhotoPrivacy?: 'EVERYONE' | 'NOBODY' | 'CONTACTS'
  createdAt: string
  lastSeen: string
  emailVerified?: boolean
  // Phase 23 — Blocking (only present on own profile)
  blockedUsers?: string[]
}

export interface AuthResponse {
  token: string
  username: string
  email: string
  userId: string
  uniqueHandle?: string
  whoCanMessage?: string
}

export interface ContactRequest {
  id: string
  fromUserId: string
  toUserId: string
  fromHandle?: string
  fromDisplayName?: string
  fromAvatarUrl?: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  createdAt: string
}

export type ContactStatus = 'NONE' | 'PENDING' | 'ACCEPTED' | 'REJECTED'

export interface Room {
  id: string
  roomId: string
  name: string
  description?: string
  createdBy: string
  members: string[]
  pinnedMessages?: string[]
  memberCount: number
  createdAt: string
  lastMessageAt?: string
}

export interface UpdateRoomRequest {
  name?: string
  description?: string
}

export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO' | 'AUDIO'

export interface Message {
  id: string
  roomId: string
  sender: string
  senderName: string
  content: string
  messageType: MessageType
  fileUrl?: string
  readBy: string[]
  readAt?: Record<string, string>  // Phase 22: per-user read timestamps
  timestamp: string
  edited?: boolean
  editedAt?: string
  deleted?: boolean
  reactions?: Record<string, string[]>

  // Phase 18 — Quote reply
  replyToId?: string
  replyToSnippet?: string
  replyToSender?: string

  // Phase 18 — Forwarded
  forwardedFrom?: string

  // Phase 19 — Starring
  starred?: string[]

  // Phase 21 — Disappearing
  disappearsAt?: string

  // Phase 27 — Threads
  threadId?: string
  threadReplyCount?: number
  lastThreadReplyAt?: string
}

export interface PagedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  last: boolean
}

export interface DirectConversation {
  id: string
  participants: string[]
  createdAt: string
  lastMessageAt?: string
  // Phase 20 — Mute & Archive
  mutedBy?: Record<string, string>   // username -> ISO date (muted until)
  archivedBy?: string[]
  // Phase 21 — Disappearing
  disappearingMessagesTimer?: 'OFF' | '24H' | '7D' | '90D'
}

export interface TypingEvent {
  roomId: string
  username: string
  typing: boolean
}

export interface PresenceEvent {
  username: string
  online: boolean
}

export interface CreateRoomRequest {
  roomId: string
  name: string
  description?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  displayName: string
  email: string
  password: string
}

export interface UpdateProfileRequest {
  displayName?: string
  bio?: string
  statusMessage?: string
  lastSeenPrivacy?: 'EVERYONE' | 'NOBODY' | 'CONTACTS'
  onlinePrivacy?: 'EVERYONE' | 'NOBODY'
  profilePhotoPrivacy?: 'EVERYONE' | 'NOBODY' | 'CONTACTS'
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

// Phase 18: Forward
export interface ForwardMessageRequest {
  roomId?: string
  conversationId?: string
}

// Phase 20: Mute
export interface MuteRequest {
  duration?: '8H' | '1W' | 'ALWAYS'
}

// Phase 21: Disappearing timer
export type DisappearingTimer = 'OFF' | '24H' | '7D' | '90D'
export interface DisappearingTimerRequest {
  timer: DisappearingTimer
}

// Phase 17: Video & Audio Calls
export type CallType = 'AUDIO' | 'VIDEO'
export type CallStatus = 'RINGING' | 'ACTIVE' | 'ENDED' | 'MISSED' | 'REJECTED'

export interface CallSession {
  id: string
  conversationId: string
  callerId: string
  calleeId: string
  callType: CallType
  status: CallStatus
  startedAt: string
  answeredAt?: string
  endedAt?: string
  durationSeconds: number
}

export type CallEventType = 'INCOMING_CALL' | 'CALL_SESSION_CREATED' | 'CALL_ANSWERED' | 'ICE_CANDIDATE' | 'CALL_ENDED' | 'CALL_BUSY' | 'MUTE_STATUS'

export interface CallEvent {
  eventType: CallEventType
  callSessionId: string
  conversationId: string
  fromUsername: string
  callType: CallType
  payload?: string
}

// Phase 18: Sending a message with reply/forward
export interface SendMessageWithReplyRequest {
  content: string
  messageType?: MessageType
  fileUrl?: string
  replyToId?: string
  replyToSnippet?: string
  replyToSender?: string
  forwardedFrom?: string
}

// Electron desktop bridge (injected by preload.js)
declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean
      platform: string
      notify: (payload: { title?: string; body?: string; chatId?: string }) => void
      setUnreadCount: (count: number) => void
      setOnlineStatus: (isOnline: boolean) => void
      reloadApp: () => void
      openExternal: (url: string) => void
      getAutoLaunch: () => Promise<boolean>
      setAutoLaunch: (enable: boolean) => Promise<void>
      onDeepLink: (callback: (url: string) => void) => void
      onUpdateAvailable: (callback: (info: { version: string }) => void) => void
      onUpdateProgress: (callback: (progress: { percent: number }) => void) => void
      onUpdateDownloaded: (callback: (info: { version: string; isMandatory?: boolean }) => void) => void
    }
  }
}
