# Chat App — Codebase Review

**Date:** 2026-03-28
**Reviewer:** Claude Code

---

## 1. What's Built

| Component | File | Status |
|-----------|------|--------|
| Spring Boot entry point | `ChatAppBackendApplication.java` | Complete |
| Message entity | `entities/Message.java` | Complete |
| Room entity | `entities/Room.java` | Complete (has typo — see issues) |
| MongoDB repository | `repositories/RoomRepository.java` | Partial |
| Room REST controller | `controllers/RoomController.java` | Skeleton only |
| Chat controller | `controllers/ChatController.java` | Empty |
| Build config | `build.gradle` | Complete |
| App config | `resources/application.properties` | Minimal |

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Java 24 |
| Framework | Spring Boot 3.5.0 |
| Database | MongoDB (localhost:27017) |
| ORM | Spring Data MongoDB |
| Real-time | WebSocket / STOMP (declared, not implemented) |
| Build tool | Gradle 8.x |
| Code generation | Lombok |
| Testing | JUnit 5 + Spring Boot Test |
| Frontend | **None** |

---

## 3. Issues & Bugs

### Bug — Typo in Room entity
- **File:** `entities/Room.java`
- **Problem:** `@Document(collation = "rooms")` should be `@Document(collection = "rooms")`
- **Impact:** Room documents may not be stored in the correct MongoDB collection

### Missing — MongoDB URI hardcoded
- **File:** `resources/application.properties`
- **Problem:** `spring.data.mongodb.uri=mongodb://localhost:27017/chatapp` is hardcoded
- **Impact:** No flexibility for staging/production environments

---

## 4. What's Missing

### Controllers
- `RoomController` — base route `/api/v1/rooms` declared but no HTTP methods implemented
  - [ ] `POST /api/v1/rooms` — create a room
  - [ ] `GET /api/v1/rooms/{roomId}` — get a room by ID
  - [ ] `GET /api/v1/rooms/{roomId}/messages` — get messages for a room
- `ChatController` — completely empty
  - [ ] Message send/receive endpoints

### Service Layer
- [ ] `RoomService` — room creation, lookup, validation logic
- [ ] `ChatService` — message handling, persistence logic

### WebSocket / Real-time
- [ ] WebSocket `@Configuration` class
- [ ] STOMP endpoint registration
- [ ] Message broker setup
- [ ] `@MessageMapping` handlers in `ChatController`
- [ ] Message broadcasting to subscribers

### Frontend
- [ ] Frontend project (React recommended)
- [ ] Room creation/join UI
- [ ] Chat message UI
- [ ] WebSocket client integration (SockJS + STOMP.js)

### Infrastructure
- [ ] Environment-based config (dev / prod profiles)
- [ ] Exception handling (`@ControllerAdvice`)
- [ ] Input validation (`@Valid`, `@NotBlank`, etc.)
- [ ] API documentation (Swagger / OpenAPI)
- [ ] DTOs for request/response payloads

### Testing
- [ ] Unit tests for services
- [ ] Integration tests for controllers
- [ ] WebSocket integration tests

---

## 5. Recommended Build Order

1. Fix `Room.java` typo (`collation` → `collection`)
2. Implement `RoomService` + `RoomController` (create room, get room, get messages)
3. Configure WebSocket/STOMP (`WebSocketConfig.java`)
4. Implement `ChatController` with `@MessageMapping` for real-time messaging
5. Add exception handling and input validation
6. Externalize config with environment variables / Spring profiles
7. Build React frontend with SockJS + STOMP.js client
8. Add Swagger/OpenAPI documentation
9. Write unit and integration tests
