export interface User {
  id: string
  username: string
  email: string
  displayName?: string
  bio?: string
  avatarUrl?: string
  createdAt: string
  lastSeen: string
}

export interface AuthResponse {
  token: string
  username: string
  email: string
  userId: string
}

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

export type MessageType = 'TEXT' | 'IMAGE' | 'FILE'

export interface Message {
  id: string
  roomId: string
  sender: string
  senderName: string
  content: string
  messageType: MessageType
  fileUrl?: string
  readBy: string[]
  timestamp: string
  edited?: boolean
  editedAt?: string
  deleted?: boolean
  reactions?: Record<string, string[]>
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
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface UpdateProfileRequest {
  displayName?: string
  bio?: string
}
