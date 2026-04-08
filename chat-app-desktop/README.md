# Baaat Desktop

Electron wrapper for the Baaat chat app. Loads the live Vercel frontend — no backend bundled.

---

## Setup

```bash
cd chat-app-desktop
npm install
```

Set your Vercel URL in `.env`:
```
VERCEL_URL=https://your-app.vercel.app
```

---

## Run (Development)

```bash
npm run dev
```

---

## Build

| Platform | Command |
|----------|---------|
| Windows `.exe` | `npm run build:win` |
| macOS `.dmg` | `npm run build:mac` |
| Linux `.deb` / `.AppImage` | `npm run build:linux` |
| All platforms | `npm run build:all` |

Output goes to `dist/`.

---

## Icons

Place the following in `assets/` before building:

| File | Used on |
|------|---------|
| `icon.ico` | Windows |
| `icon.icns` | macOS |
| `icon.png` | Linux, notifications, tray fallback |
| `tray.png` | System tray (16×16 or 32×32, ideally template image on macOS) |

---

## Features

- **System tray** — minimize to tray, right-click to Open / Quit
- **Single instance** — second launch focuses the existing window
- **Window state** — size and position persisted across restarts
- **Offline detection** — offline banner shown in-app; auto-reloads when back online
- **Offline launch** — shows a clean offline page instead of a broken white screen
- **Notifications** — native OS notifications when window is unfocused; click to focus chat
- **Badge count** — taskbar/dock unread count via `window.electronAPI.setUnreadCount(n)`
- **Auto launch** — toggle "Start on Login" from the tray menu
- **Deep links** — `baaat://` protocol registered for future deep-link support
- **Auto updater** — stub wired up; add a GitHub release server when ready

---

## Web App Integration

The Vercel frontend can detect Electron and call these APIs:

```js
if (window.electronAPI?.isElectron) {
  // Send a notification
  window.electronAPI.notify({ title: 'Alice', body: 'Hey!', chatId: 'room-123' });

  // Update unread badge
  window.electronAPI.setUnreadCount(5);

  // Toggle auto-launch
  window.electronAPI.setAutoLaunch(true);

  // Open a URL externally
  window.electronAPI.openExternal('https://example.com');
}
```

---

## Architecture

```
main.js          — Main process: window, tray, IPC, notifications, updater
preload.js       — Exposes electronAPI to the renderer via contextBridge
offline.html     — Shown when app launches with no internet
assets/          — Icons
.env             — VERCEL_URL (git-ignored)
```
