# BChat

A real-time chat app built with Spring Boot and React.

**Features:** Group rooms, direct messages, file/image sharing, emoji reactions, message edit/delete, typing indicators, online presence, message pinning, group admin controls.

---

## Prerequisites

Make sure you have these installed before starting:

- [Java 17+](https://adoptium.net/)
- [Node.js 18+](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/try/download/community) running on `localhost:27017`
- [Redis](https://redis.io/download/) running on `localhost:6379`

---

## Quick Start

You need to run **two terminals** — one for the backend, one for the frontend.

### 1. Start the Backend

```bash
cd chat-app-backend
./gradlew bootRun
```

> On Windows: use `gradlew.bat bootRun` if the above doesn't work.

The backend starts at **http://localhost:8080**

### 2. Start the Frontend

Open a second terminal:

```bash
cd chat-app-frontend
npm install
npm run dev
```

The frontend starts at **http://localhost:5173**

### 3. Open the App

Go to **http://localhost:5173** in your browser, register an account, and start chatting.

---

## Environment Setup (Optional)

The app works out of the box with default settings. If you want to customize:

**Backend** — create `chat-app-backend/src/main/resources/application-dev.properties`:
```properties
spring.data.mongodb.uri=mongodb://localhost:27017/chatapp
jwt.secret=your-secret-key-here
spring.data.redis.host=localhost
spring.data.redis.port=6379
```

**Frontend** — create `chat-app-frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_WS_URL=http://localhost:8080/ws
```

---

## Running Tests

**Backend tests:**
```bash
cd chat-app-backend
./gradlew test
```

**Frontend tests:**
```bash
cd chat-app-frontend
npm test
```

---

## Project Structure

```
Chat App/
├── chat-app-backend/     Spring Boot API + WebSocket server
└── chat-app-frontend/    React + TypeScript + Tailwind UI
```

---

## Tech Stack

| | Technology |
|-|-----------|
| Backend | Java, Spring Boot, MongoDB, Redis |
| Real-time | WebSocket (STOMP over SockJS) |
| Auth | JWT (Spring Security) |
| File Storage | Cloudinary |
| Frontend | React 18, TypeScript, Tailwind CSS, Zustand |

---

## Deployment & Releasing

### Push any code change to production

```bash
git add .
git commit -m "your message"
git push origin desktop-version

git checkout main
git merge desktop-version
git push origin main
git checkout desktop-version
```

Vercel auto-deploys the frontend when `main` is updated. Backend deploys automatically on Render.

---

### Release a new desktop app version

**Step 1 — Bump the version** in `chat-app-desktop/package.json`:
```json
"version": "1.0.1"
```

**Step 2 — Commit, tag, and push:**
```bash
git add chat-app-desktop/package.json
git commit -m "bump desktop version to 1.0.1"
git push origin desktop-version

git checkout main
git merge desktop-version
git push origin main
git checkout desktop-version

git tag v1.0.1
git push origin v1.0.1
```

GitHub Actions will automatically:
- Build `Baaat-Setup-1.0.1.exe` on a Windows runner
- Upload it to a new GitHub Release
- All installed apps will silently download the update and prompt users to restart

Watch the build at: `https://github.com/BhawaniSingh02/BChat/actions`

---

### Re-release the same version (if a build failed)

```bash
git tag -d v1.0.0
git push origin --delete v1.0.0
git tag v1.0.0
git push origin v1.0.0
```

---

### Run the desktop app locally (development)

```bash
cd chat-app-desktop
npm install        # first time only
npm run dev
```

---

## Common Issues

**MongoDB not connecting** — make sure MongoDB is running: `mongod` or start the MongoDB service.

**Redis not connecting** — make sure Redis is running: `redis-server`.

**Port 8080 already in use** — stop whatever is using it, or change the port in `application.properties`:
```properties
server.port=8081
```

**`./gradlew` permission denied (Mac/Linux)** — run `chmod +x gradlew` first.
