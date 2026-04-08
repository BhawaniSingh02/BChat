# Baaat Desktop

Electron wrapper for the Baaat chat app. Loads the live Vercel frontend — no backend bundled.

---

## Setup

```bash
cd chat-app-desktop
npm install
```

`.env` already has the Vercel URL set — no changes needed.

---

## Run (Development)

```bash
npm run dev
```

---

## Releasing a New Version

**Never build locally** — GitHub Actions handles it automatically.

1. Bump `"version"` in `package.json` (e.g. `1.0.0` → `1.0.1`)
2. Commit, merge to main, and push a tag:

```bash
git add package.json
git commit -m "bump version to 1.0.1"
git push origin desktop-version

git checkout main
git merge desktop-version
git push origin main
git checkout desktop-version

git tag v1.0.1
git push origin v1.0.1
```

GitHub Actions builds the `.exe` and uploads it to a GitHub Release automatically.
Installed apps will auto-update silently within 2 hours.

Watch the build: `https://github.com/BhawaniSingh02/BChat/actions`

---

## Re-releasing the Same Tag (if build failed)

```bash
git tag -d v1.0.0
git push origin --delete v1.0.0
git tag v1.0.0
git push origin v1.0.0
```

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
