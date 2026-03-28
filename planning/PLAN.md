# SaaS Chat App — Full Build Plan
### WhatsApp-style real-time messaging platform

**Date:** 2026-03-28
**Status:** Planning

---

## Vision

A production-grade SaaS chat application with real-time messaging, user authentication, group rooms, direct messages, media sharing, and online presence — built on the existing Spring Boot + MongoDB backend and a new React frontend.

---

## Full Tech Stack Decision

| Layer | Technology | Reason |
|-------|-----------|--------|
| Backend Language | Java 24 | Already in use |
| Backend Framework | Spring Boot 3.5.0 | Already in use |
| Real-time | WebSocket + STOMP | Already declared in deps |
| Database | MongoDB | Already in use |
| Auth | JWT (Spring Security) | Stateless, SaaS-friendly |
| File Storage | Cloudinary (or AWS S3) | Media/image uploads |
| Cache | Redis | Online presence, sessions |
| Frontend | React 18 + TypeScript | Industry standard |
| Styling | Tailwind CSS | Fast, utility-first |
| State Management | Zustand | Lightweight, simple |
| WebSocket Client | SockJS + STOMP.js | Pairs with Spring backend |
| HTTP Client | Axios | REST API calls |
| Build Tool | Vite | Fast dev server |
| Containerization | Docker + Docker Compose | Local dev parity |

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│                React Frontend                │
│  (Vite + TypeScript + Tailwind + Zustand)   │
└────────────────────┬────────────────────────┘
                     │ REST + WebSocket (STOMP)
┌────────────────────▼────────────────────────┐
│           Spring Boot Backend               │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   Auth   │  │  Rooms   │  │   Chat   │  │
│  │Controller│  │Controller│  │Controller│  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │              │              │        │
│  ┌────▼──────────────▼──────────────▼─────┐ │
│  │              Service Layer             │ │
│  └────┬──────────────┬──────────────┬─────┘ │
│       │              │              │        │
│  ┌────▼───┐    ┌─────▼──┐    ┌─────▼─────┐ │
│  │MongoDB │    │ Redis  │    │Cloudinary │ │
│  └────────┘    └────────┘    └───────────┘ │
└─────────────────────────────────────────────┘
```

---

## Feature List

### Core (MVP)
- [ ] User registration & login (JWT)
- [ ] Create / join chat rooms
- [ ] Can Search user by his @userid 
- [ ] Real-time messaging via WebSocket
- [ ] Message history (paginated)
- [ ] User profile (name, avatar)
- [ ] Online / offline presence indicator

### Phase 2
- [ ] Direct messages (1-on-1)
- [ ] Image & file sharing
- [ ] Message read receipts (single tick / double tick)
- [ ] Typing indicator ("User is typing…")
- [ ] Emoji reactions
- [ ] Message search

### Phase 3 (SaaS)
- [ ] Notifications (in-app + browser push)
- [ ] Message delete / edit
- [ ] Group admin controls (kick, promote)
- [ ] User blocking
- [ ] End-to-end encryption (E2EE)
- [ ] Multi-device support

---

## Backend Build Plan

### Phase 1 — Foundation Fixes

**Step 1 — Fix existing bugs**
- Fix `Room.java` typo: `collation` → `collection`
- Externalize MongoDB URI to environment variables
- Add Spring profiles: `application-dev.properties`, `application-prod.properties`

**Step 2 — Project structure reorganization**
```
src/main/java/com/substring/chat/
├── config/
│   ├── WebSocketConfig.java
│   ├── SecurityConfig.java
│   └── CorsConfig.java
├── controllers/
│   ├── AuthController.java
│   ├── RoomController.java
│   └── ChatController.java
├── services/
│   ├── AuthService.java
│   ├── RoomService.java
│   ├── ChatService.java
│   └── UserService.java
├── entities/
│   ├── User.java
│   ├── Room.java
│   └── Message.java
├── repositories/
│   ├── UserRepository.java
│   └── RoomRepository.java
├── dto/
│   ├── request/
│   │   ├── LoginRequest.java
│   │   ├── RegisterRequest.java
│   │   ├── CreateRoomRequest.java
│   │   └── SendMessageRequest.java
│   └── response/
│       ├── AuthResponse.java
│       ├── RoomResponse.java
│       └── MessageResponse.java
├── security/
│   ├── JwtTokenProvider.java
│   ├── JwtAuthFilter.java
│   └── UserDetailsServiceImpl.java
└── exceptions/
    ├── GlobalExceptionHandler.java
    ├── RoomNotFoundException.java
    └── UserAlreadyExistsException.java
```

### Phase 2 — Auth System

**Entities to add/update:**
- `User`: id, username, email, passwordHash, avatarUrl, createdAt, lastSeen

**Endpoints:**
```
POST /api/v1/auth/register   → Register new user
POST /api/v1/auth/login      → Login, returns JWT
GET  /api/v1/auth/me         → Get current user (requires JWT)
```

**Implementation:**
- Spring Security with stateless JWT
- BCrypt password hashing
- JWT expiry + refresh token support

### Phase 3 — Room & Message APIs

**Endpoints:**
```
POST   /api/v1/rooms                        → Create room
GET    /api/v1/rooms/{roomId}               → Get room details
GET    /api/v1/rooms/{roomId}/messages      → Get messages (paginated)
GET    /api/v1/rooms/user/{userId}          → Get all rooms for a user
POST   /api/v1/rooms/{roomId}/join          → Join a room
DELETE /api/v1/rooms/{roomId}/leave         → Leave a room
```

**Pagination:** All message lists return paginated results (page + size query params)

### Phase 4 — WebSocket / Real-time

**WebSocketConfig.java:**
- STOMP endpoint: `/ws` (with SockJS fallback)
- Message broker: `/topic` (broadcast), `/queue` (direct)
- App destination prefix: `/app`

**STOMP Destinations:**
```
/app/chat.sendMessage/{roomId}     → Send message to room
/app/chat.addUser/{roomId}         → User joins room
/topic/room/{roomId}               → Subscribe to room messages
/topic/presence                    → Subscribe to online presence updates
/user/queue/notifications          → User-specific notifications
```

**ChatController `@MessageMapping` methods:**
- `sendMessage` — persist + broadcast to `/topic/room/{roomId}`
- `addUser` — notify room members of new user joining
- `typing` — broadcast typing indicator

### Phase 5 — Online Presence (Redis)

- On WebSocket connect: store `userId → ONLINE` in Redis with TTL
- On WebSocket disconnect: set `userId → OFFLINE`, update `lastSeen`
- Broadcast presence changes to subscribers of `/topic/presence`

### Phase 6 — Media Upload

- `POST /api/v1/upload` — accepts multipart file, uploads to Cloudinary, returns URL
- Store URL in message content with type `IMAGE` or `FILE`
- Message entity gets a `messageType` enum: `TEXT`, `IMAGE`, `FILE`

---

## Frontend Build Plan

### Setup
```
chat-app-frontend/
├── public/
├── src/
│   ├── api/           (Axios instances + API calls)
│   ├── components/
│   │   ├── auth/      (LoginForm, RegisterForm)
│   │   ├── chat/      (MessageList, MessageInput, MessageBubble)
│   │   ├── rooms/     (RoomList, RoomCard, CreateRoomModal)
│   │   ├── layout/    (Sidebar, Header, MainLayout)
│   │   └── ui/        (Avatar, Badge, Button, Input, Modal)
│   ├── hooks/         (useWebSocket, useAuth, useRoom, usePresence)
│   ├── pages/         (LoginPage, RegisterPage, ChatPage)
│   ├── store/         (Zustand stores: authStore, chatStore, roomStore)
│   ├── types/         (TypeScript interfaces)
│   └── utils/         (date formatting, file helpers)
├── package.json
├── vite.config.ts
└── tailwind.config.ts
```

### Key Screens

**1. Login / Register Page**
- Clean centered card layout
- Email + password fields
- Redirect to chat on success

**2. Main Chat Layout (WhatsApp-style)**
```
┌──────────────┬────────────────────────────────┐
│              │  Room Name              [icons] │
│  Search      ├────────────────────────────────┤
│              │                                │
│  [Room 1]    │     Message bubbles            │
│  [Room 2]    │     (scrollable)               │
│  [Room 3]    │                                │
│              ├────────────────────────────────┤
│  [+ New Room]│  [📎] [Type a message...] [➤] │
└──────────────┴────────────────────────────────┘
```

**3. Room List Sidebar**
- Room name, last message preview, timestamp
- Unread message count badge
- Online presence dot on avatar

**4. Message Bubbles**
- Sent messages: right-aligned, colored
- Received messages: left-aligned, white/grey
- Timestamp below each message
- Read receipt ticks
- Image preview inline

### WebSocket Hook (`useWebSocket.ts`)
- Connect on login, disconnect on logout
- Subscribe to room topic on room open
- Subscribe to presence topic globally
- Dispatch incoming messages to Zustand store

---

## Database Schema (MongoDB)

### `users` collection
```json
{
  "_id": "ObjectId",
  "username": "string",
  "email": "string (unique)",
  "passwordHash": "string",
  "avatarUrl": "string",
  "createdAt": "ISODate",
  "lastSeen": "ISODate"
}
```

### `rooms` collection
```json
{
  "_id": "ObjectId",
  "roomId": "string (unique, slug)",
  "name": "string",
  "description": "string",
  "createdBy": "userId ref",
  "members": ["userId"],
  "createdAt": "ISODate",
  "lastMessageAt": "ISODate"
}
```

### `messages` collection (separate from rooms for scalability)
```json
{
  "_id": "ObjectId",
  "roomId": "string",
  "sender": "userId ref",
  "senderName": "string",
  "content": "string",
  "messageType": "TEXT | IMAGE | FILE",
  "fileUrl": "string",
  "readBy": ["userId"],
  "timestamp": "ISODate"
}
```

---

## Environment Variables

### Backend (`application-dev.properties`)
```
MONGODB_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=your-secret-key
JWT_EXPIRY_MS=86400000
REDIS_HOST=localhost
REDIS_PORT=6379
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend (`.env`)
```
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_WS_URL=http://localhost:8080/ws
```

---

## Docker Compose (Local Dev)

```yaml
services:
  mongodb:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: [mongo_data:/data/db]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  backend:
    build: ./chat-app-backend
    ports: ["8080:8080"]
    depends_on: [mongodb, redis]
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/chatapp
      - REDIS_HOST=redis

  frontend:
    build: ./chat-app-frontend
    ports: ["5173:5173"]
    depends_on: [backend]
```

---

## Build Phases & Order

| Phase | Work | Priority |
|-------|------|----------|
| **0** | Fix bugs in existing code (Room typo, hardcoded config) | Immediate |
| **1** | User entity + Auth (register, login, JWT) | High |
| **2** | Room CRUD endpoints + RoomService | High |
| **3** | WebSocket config + real-time messaging | High |
| **4** | React frontend scaffold + auth pages | High |
| **5** | Chat UI (sidebar, message list, input) | High |
| **6** | Online presence with Redis | Medium |
| **7** | Media upload (Cloudinary) | Medium |
| **8** | Direct messages (1-on-1) | Medium |
| **9** | Read receipts + typing indicators | Medium |
| **10** | Notifications (in-app + push) | Low |
| **11** | Message edit / delete | Low |
| **12** | Docker Compose setup | Low |
| **13** | Swagger / OpenAPI docs | Low |
| **14** | Unit + integration tests | Low |

---

## Notes

- Messages should be stored in a **separate collection**, not embedded in the Room document. Embedding causes the document to grow unboundedly and kills performance at scale.
- Use **MongoDB indexes** on `roomId` and `timestamp` in the messages collection for fast paginated queries.
- JWT tokens should be stored in **httpOnly cookies**, not localStorage, to prevent XSS.
- WebSocket connections must validate the JWT on handshake (via `ChannelInterceptor`).
- Rate-limit the message send endpoint to prevent spam.
