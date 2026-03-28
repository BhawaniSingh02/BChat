# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Structure

```
Chat App/
├── planning/
│   ├── REVIEW.md        (codebase audit)
│   └── PLAN.md          (full SaaS build plan — read this before starting work)
└── chat-app-backend/    (Spring Boot application — only backend exists so far)
```

A React frontend (`chat-app-frontend/`) does not exist yet. See `planning/PLAN.md` for the full build plan.

---

## Backend Commands

All commands run from inside `chat-app-backend/`.

```bash
# Run the application
./gradlew bootRun

# Build (produces jar in build/libs/)
./gradlew build

# Run all tests
./gradlew test

# Run a single test class
./gradlew test --tests "com.substring.chat.ChatAppBackendApplicationTests"

# Clean build artifacts
./gradlew clean
```

On Windows without a Unix shell, use `gradlew.bat` instead of `./gradlew`.

The app starts on `http://localhost:8080`. Requires a local MongoDB instance running on `mongodb://localhost:27017`.

---

## Architecture

### Package layout (`com.substring.chat`)
- `entities/` — MongoDB document models (`Room`, `Message`). No `@Service` or controller logic here.
- `repositories/` — Spring Data MongoDB interfaces extending `MongoRepository`.
- `controllers/` — `@RestController` classes for REST, `@Controller` for WebSocket `@MessageMapping` handlers.
- `config/` *(planned)* — `WebSocketConfig`, `SecurityConfig`, `CorsConfig`.
- `services/` *(planned)* — Business logic layer between controllers and repositories.
- `dto/` *(planned)* — Request/response payload classes, never expose entities directly from controllers.
- `security/` *(planned)* — JWT filter, token provider, `UserDetailsService`.

### Data model decisions
- `Room` embeds a `List<Message>` currently — **this must be migrated** to a separate `messages` collection before adding real data. Embedded messages cause unbounded document growth.
- `Message` auto-sets `timeStamp` to `LocalDateTime.now()` in its 2-arg constructor.
- `RoomRepository.findByRoomId(String)` queries the `roomId` field (not the MongoDB `_id`).

### Known bugs to fix before adding features
1. `Room.java` line 15: `@Document(collation = "rooms")` → must be `@Document(collection = "rooms")`
2. `RoomController.java` line 8: base path is `/spi/v1/rooms` (typo) → should be `/api/v1/rooms`
3. MongoDB URI is hardcoded in `application.properties` — externalize via env var `MONGODB_URI`

### WebSocket plan
- STOMP over SockJS, endpoint `/ws`
- App prefix `/app`, broker destinations `/topic` (broadcast) and `/queue` (direct)
- JWT must be validated on WebSocket handshake via a `ChannelInterceptor`, not just on HTTP

### Auth plan
- Spring Security + stateless JWT
- JWT stored in `httpOnly` cookies (not localStorage)
- `POST /api/v1/auth/register` and `POST /api/v1/auth/login` are unauthenticated; all other routes require a valid token

---

## Dependencies (declared in `build.gradle`)

| Dependency | Purpose |
|-----------|---------|
| `spring-boot-starter-data-mongodb` | ODM + `MongoRepository` |
| `spring-boot-starter-web` | REST controllers |
| `spring-boot-starter-websocket` | STOMP/WebSocket support |
| `lombok` | `@Getter/@Setter/@NoArgsConstructor/@AllArgsConstructor` |
| `spring-boot-devtools` | Hot reload in dev |

Still needed (not yet added): `spring-boot-starter-security`, `jjwt` (JWT), `spring-boot-starter-data-redis` (presence), Cloudinary SDK.
