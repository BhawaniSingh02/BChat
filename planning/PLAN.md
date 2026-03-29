# SaaS Chat App — Full Build Plan
### WhatsApp-style real-time messaging platform

**Date:** 2026-03-29
**Status:** Active Development — Phase 15 complete, Phase 16 next

---

## Vision

A production-grade SaaS chat application with real-time messaging, user authentication, group rooms, direct messages, media sharing, and online presence — built on Spring Boot + MongoDB backend and a React frontend.

---

## Full Tech Stack Decision

| Layer | Technology | Reason |
|-------|-----------|--------|
| Backend Language | Java 24 | Already in use |
| Backend Framework | Spring Boot 3.5.0 | Already in use |
| Real-time | WebSocket + STOMP | Already declared in deps |
| Database | MongoDB | Already in use |
| Auth | JWT (Spring Security) | Stateless, SaaS-friendly |
| File Storage | Cloudinary | Media/image uploads |
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

### Core (MVP) — ✅ All Done
- [x] User registration & login (JWT)
- [x] Create / join / leave chat rooms
- [x] Search users by @username
- [x] Real-time messaging via WebSocket
- [x] Message history (paginated)
- [x] User profile (display name, bio, avatar)
- [x] Online / offline presence indicator

### Phase 2 — ✅ All Done
- [x] Direct messages (1-on-1)
- [x] Image & file sharing (Cloudinary)
- [x] Message read receipts (single tick / double tick / blue ticks)
- [x] Typing indicator ("User is typing…")
- [x] Emoji reactions (room + DM)
- [x] Message edit & delete (room + DM)
- [x] In-room message search

### Phase 3 — ✅ All Done
- [x] WhatsApp-style UI (bubble tails, SVG ticks, emoji picker)
- [x] Fully responsive layout (mobile-first, sidebar collapse)
- [x] Group admin controls (kick members, update room name/description)
- [x] Admin badge in members panel
- [x] Message pinning (up to 3 per room, pinned bar in header)
- [x] Quick switcher (Ctrl+K)
- [x] User profile modal

### Upcoming — Phase 4 (SaaS features)
- [ ] User blocking & privacy settings
- [ ] Voice messages (MediaRecorder → Cloudinary → inline audio player)
- [ ] Global message search (across all rooms + DMs)
- [ ] In-app notifications (unread count in browser tab title)
- [ ] Docker Compose + GitHub Actions CI/CD
- [ ] Message threads (reply in thread, side panel)
- [ ] End-to-end encryption (E2EE)

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
│   ├── ChatController.java
│   ├── DirectMessageController.java
│   ├── UserController.java
│   ├── PresenceController.java
│   └── FileUploadController.java
├── services/
│   ├── AuthService.java
│   ├── RoomService.java
│   ├── DirectMessageService.java
│   ├── UserService.java
│   ├── PresenceService.java
│   └── MessageRateLimiter.java
├── entities/
│   ├── User.java
│   ├── Room.java
│   ├── Message.java
│   └── DirectConversation.java
├── repositories/
│   ├── UserRepository.java
│   ├── RoomRepository.java
│   ├── MessageRepository.java
│   └── DirectConversationRepository.java
├── dto/
│   ├── request/
│   │   ├── LoginRequest.java
│   │   ├── RegisterRequest.java
│   │   ├── CreateRoomRequest.java
│   │   ├── UpdateRoomRequest.java
│   │   └── SendMessageRequest.java
│   └── response/
│       ├── AuthResponse.java
│       ├── RoomResponse.java
│       ├── MessageResponse.java
│       └── UserResponse.java
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
- `User`: id, username, email, passwordHash, displayName, bio, avatarUrl, createdAt, lastSeen

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
POST   /api/v1/rooms                              → Create room
GET    /api/v1/rooms                              → Get all rooms
GET    /api/v1/rooms/{roomId}                     → Get room details
GET    /api/v1/rooms/{roomId}/messages            → Get messages (paginated)
GET    /api/v1/rooms/mine                         → Get rooms for current user
POST   /api/v1/rooms/{roomId}/join                → Join a room
DELETE /api/v1/rooms/{roomId}/leave               → Leave a room
PATCH  /api/v1/rooms/{roomId}                     → Update room (admin only)
DELETE /api/v1/rooms/{roomId}/members/{username}  → Kick member (admin only)
POST   /api/v1/rooms/{roomId}/pin/{messageId}     → Pin message (admin only)
DELETE /api/v1/rooms/{roomId}/pin/{messageId}     → Unpin message (admin only)
```

**Pagination:** All message lists return paginated results (page + size query params)

### Phase 4 — WebSocket / Real-time

**WebSocketConfig.java:**
- STOMP endpoint: `/ws` (with SockJS fallback)
- Message broker: `/topic` (broadcast), `/queue` (direct)
- App destination prefix: `/app`

**STOMP Destinations:**
```
/app/chat.sendMessage/{roomId}         → Send message to room
/app/chat.typing/{roomId}              → Typing indicator
/app/chat.edit/{roomId}                → Edit room message
/app/chat.delete/{roomId}              → Delete room message
/app/chat.react/{roomId}               → React to room message
/app/dm.send/{conversationId}          → Send DM
/app/dm.edit/{conversationId}          → Edit DM message
/app/dm.delete/{conversationId}        → Delete DM message
/app/dm.react/{conversationId}         → React to DM message
/topic/room/{roomId}                   → Subscribe to room messages
/topic/presence                        → Subscribe to presence updates
/user/queue/messages                   → User-targeted DM + notifications
```

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
│   │   ├── chat/      (MessageList, MessageInput, MessageBubble, MembersPanel,
│   │   │               DMChatView, ChatView, MessageSearch)
│   │   ├── rooms/     (RoomList, RoomCard, CreateRoomModal, RoomSettingsModal)
│   │   ├── layout/    (Sidebar, Header)
│   │   └── ui/        (Avatar, Badge, Modal, QuickSwitcher, UserProfileModal)
│   ├── hooks/         (useWebSocket)
│   ├── pages/         (LoginPage, RegisterPage, ChatPage)
│   ├── store/         (authStore, chatStore, roomStore, dmStore, presenceStore)
│   ├── types/         (TypeScript interfaces)
│   └── utils/         (date formatting, file helpers)
├── src/test/          (Vitest unit + component tests)
├── package.json
├── vite.config.ts
└── tailwind.config.ts
```

### Key Screens

**1. Login / Register Page**
- Clean centered card layout
- Username + password fields
- Redirect to chat on success

**2. Main Chat Layout (WhatsApp-style)**
```
┌──────────────┬────────────────────────────────┐
│              │  Room Name              [icons] │
│  Search      ├────────────────────────────────┤
│              │  [Pinned message bar]           │
│  [Room 1]    │                                │
│  [Room 2]    │     Message bubbles            │
│  [Room 3]    │     (scrollable)               │
│              ├────────────────────────────────┤
│  [+ New Room]│  [📎] [Type a message...] [➤] │
└──────────────┴────────────────────────────────┘
```

**3. Room List Sidebar**
- Room name, last message preview, timestamp
- Unread message count badge
- Online presence dot on avatar
- DM conversations list below rooms

**4. Message Bubbles**
- Sent messages: right-aligned, green (#dcf8c6)
- Received messages: left-aligned, white
- WhatsApp-style CSS bubble tails
- SVG read receipt ticks (grey / double / blue)
- Emoji reactions bar below bubble
- Edit / delete / react / pin action bar on hover
- Image preview inline

---

## Database Schema (MongoDB)

### `users` collection
```json
{
  "_id": "ObjectId",
  "username": "string (unique)",
  "email": "string (unique)",
  "passwordHash": "string",
  "displayName": "string",
  "bio": "string",
  "avatarUrl": "string",
  "blockedUsers": ["username"],
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
  "createdBy": "username",
  "members": ["username"],
  "pinnedMessages": ["messageId"],
  "createdAt": "ISODate",
  "lastMessageAt": "ISODate"
}
```

### `messages` collection
```json
{
  "_id": "ObjectId",
  "roomId": "string (roomId or 'dm:{conversationId}')",
  "sender": "username",
  "senderName": "string",
  "content": "string",
  "messageType": "TEXT | IMAGE | FILE | AUDIO",
  "fileUrl": "string",
  "reactions": { "emoji": ["username"] },
  "readBy": ["username"],
  "edited": "boolean",
  "editedAt": "ISODate",
  "deleted": "boolean",
  "timestamp": "ISODate"
}
```

### `direct_conversations` collection
```json
{
  "_id": "ObjectId",
  "participants": ["username"],
  "createdAt": "ISODate",
  "lastMessageAt": "ISODate"
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

| Phase | Work | Status |
|-------|------|--------|
| **0** | Fix bugs in existing code (Room typo, hardcoded config) | ✅ Done |
| **1** | User entity + Auth (register, login, JWT) | ✅ Done |
| **2** | Room CRUD endpoints + RoomService | ✅ Done |
| **3** | WebSocket config + real-time messaging | ✅ Done |
| **4** | React frontend scaffold + auth pages | ✅ Done |
| **5** | Chat UI (sidebar, message list, input) | ✅ Done |
| **6** | Online presence with Redis | ✅ Done |
| **7** | Media upload (Cloudinary) | ✅ Done |
| **8** | Direct messages (1-on-1) | ✅ Done |
| **9** | Read receipts + typing indicators | ✅ Done |
| **10** | Message edit / delete + emoji reactions (room) | ✅ Done |
| **11** | WhatsApp UI polish: bubble tails, ticks, emoji picker, profiles | ✅ Done |
| **12** | Responsive layout (mobile-first, sidebar collapse) | ✅ Done |
| **13** | DM edit / delete / react WebSocket endpoints + frontend wiring | ✅ Done |
| **14** | Group admin controls: kick members, update room, admin badge | ✅ Done |
| **15** | Message pinning (max 3 per room, pinned bar in ChatView) | ✅ Done |
| **16** | User blocking & privacy settings | 🔲 Next |
| **17** | Voice messages (record + upload + inline audio player) | 🔲 Planned |
| **18** | Global message search (MongoDB text index) | 🔲 Planned |
| **19** | In-app notifications (browser tab badge, toast) | 🔲 Planned |
| **20** | Docker Compose + GitHub Actions CI/CD | 🔲 Planned |
| **21** | Message threads (side panel, threaded replies) | 🔲 Planned |
| **22** | Performance & scale (cursor pagination, virtual scroll, Redis cache) | 🔲 Planned |

---

## Upcoming Phases — Detail

### Phase 16 — User Blocking & Privacy
- Block user: hides their messages from your view, prevents them from starting new DMs.
- Backend: `blockedUsers: List<String>` on `User` entity.
- Endpoints: `POST /api/v1/users/{username}/block`, `DELETE /api/v1/users/{username}/block`, `GET /api/v1/users/blocked`
- Frontend: Block button in `UserProfileModal`, blocked list in profile settings tab.
- Privacy setting: "Who can DM me" — Everyone / Nobody.

### Phase 17 — Voice Messages
- Record audio in browser using `MediaRecorder` API, upload to Cloudinary as `.webm`.
- `messageType: AUDIO`; render custom inline audio player with play/pause and duration.
- Backend upload endpoint extended to accept `AUDIO` type.

### Phase 18 — Global Message Search
- Global search across all rooms and DMs the user has access to.
- Backend: MongoDB text index on `messages.content`; `GET /api/v1/search/messages?q=...`
- Frontend: Search modal integrated with Ctrl+K quick switcher.

### Phase 19 — In-App Notifications
- Browser tab title shows unread count: `(3) BChat`.
- Toast notifications for new messages when app is in background tab.
- Notification bell icon in sidebar header with dropdown list.

### Phase 20 — Docker Compose & CI/CD
- `docker-compose.yml` for local dev: MongoDB, Redis, backend, frontend.
- GitHub Actions: run tests on PR, build + push Docker image on merge to main.
- Environment-specific configs via `.env` files and Spring profiles.

### Phase 21 — Message Threads
- Reply in thread: click a message → open right-side thread panel.
- `threadId` field on `Message`; threaded messages stored in same collection.
- Thread reply count badge shown on parent message.

### Phase 22 — Performance & Scale
- Paginate message history (cursor-based, not offset) for large rooms.
- Redis caching for frequently-read rooms list.
- MongoDB TTL index for soft-deleted messages (purge after 30 days).
- Frontend: virtual scroll for very long message lists.

---

## Test Coverage Summary (as of Phase 15)

| Suite | Files | Tests | Status |
|-------|-------|-------|--------|
| Frontend (Vitest) | 23 | **250** | ✅ All passing |
| Backend (JUnit) | 17 | **165** | ✅ All passing |

---

## Notes

- Messages are stored in a **separate collection**, not embedded in the Room document. Embedding causes the document to grow unboundedly.
- Use **MongoDB indexes** on `roomId` and `timestamp` in the messages collection for fast paginated queries.
- JWT tokens are stored in **httpOnly cookies**, not localStorage, to prevent XSS.
- WebSocket connections validate the JWT on handshake via a `ChannelInterceptor`.
- Rate limiting is applied on the message send WS endpoint to prevent spam.
- DM messages use `roomId = "dm:{conversationId}"` to reuse the `messages` collection without a separate DM messages collection.
