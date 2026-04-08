# Desktop App Build Plan
### Electron wrapper for Baaat — professional SaaS desktop version

**Architecture:** Electron loads the live Vercel frontend URL. Backend stays on Render. No bundling.

---

## Build Prompt

Build a professional Electron desktop app for our chat application in a new `chat-app-desktop/` folder.

The app wraps our live Vercel frontend URL. Do not bundle the backend.

Requirements:

CORE SETUP
- Electron with the Vercel frontend URL as the main window
- Proper package.json with build scripts for Windows (.exe), Mac (.dmg), Linux (.deb)
- electron-builder for packaging
- App name: Baaat, match the branding

OFFLINE / NETWORK HANDLING (like WhatsApp desktop)
- Detect when network goes offline using navigator.onLine + online/offline window events
- Show a native offline banner/overlay inside the app when no internet
- When network comes back, automatically reload the app / reconnect WebSocket without user doing anything
- Show a "Reconnecting..." state while WebSocket is re-establishing
- If offline at launch, show a clean offline screen instead of a broken white page

SYSTEM TRAY
- Minimize to system tray instead of closing (like WhatsApp)
- Tray icon with right-click menu: Open, Quit
- Show/hide window on tray icon click

NOTIFICATIONS
- Native OS desktop notifications when a message arrives and window is not focused
- Clicking the notification brings the app window to front and focuses the correct chat
- Notification badge count on taskbar/dock icon (unread count)

WINDOW BEHAVIOR
- Remember window size and position between launches (electron-store or similar)
- Single instance lock — if app already open, focus existing window instead of opening second one
- Prevent accidental close — minimize to tray on close button click
- Re-open to last position on launch

AUTO LAUNCH (optional, toggle in app)
- Option to start app on system startup

DEEP LINKING
- Register a custom protocol baaat:// for future deep link support

Use electron-store for persisting window state.
Use electron-updater stub (no actual update server yet, just the structure).

Create a git-ignored .env file for the Vercel URL so it can be changed easily.
Add a README inside chat-app-desktop/ explaining how to run and build.

---


## Notes

- Vercel URL goes in chat-app-desktop/.env (git-ignored)
- Backend on Render — no changes needed
- This is safe to experiment on — main branch and web app are never touched
