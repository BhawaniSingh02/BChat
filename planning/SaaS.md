# SaaS Roadmap

## Goal

Turn the current chat app into a stronger SaaS product that:

- works reliably online
- supports offline reading and drafting
- syncs messages when the network comes back
- can later expand to desktop app and mobile app delivery

## Important Note

True person-to-person chat while both users are fully offline is usually not realistic in a normal SaaS model.

What we should build instead:

- users can open the app without network
- users can read cached conversations
- users can write messages offline
- offline messages stay in a local queue
- queued messages sync automatically after reconnect

## What To Build Next

### Phase 1: Stabilize Core Product

- Fix the main issues already found in `CODEXREVIEW.md`
- Make chat, call, voice message, and conversation settings reliable
- Improve startup/loading UX and reconnect behavior
- Add stronger automated tests for call flows, voice recording, and settings

### Phase 2: Offline-First Foundation

- Add client-side local storage/database for messages, conversations, and user session
- Cache recent chats so users can open and read them without internet
- Add offline detection in the UI
- Show clear online/offline/syncing status

### Phase 3: Offline Message Queue

- Let users write and send messages while offline
- Store unsent messages locally with `pending`, `sent`, and `failed` states
- Auto-retry queued messages when connection returns
- Prevent duplicates with message IDs and server-side deduplication

### Phase 4: Sync Engine

- Build sync logic for messages, conversation updates, and read states
- Handle reconnect safely after app reload or long offline periods
- Add conflict handling for edits/deletes/reactions
- Ensure message ordering stays correct after sync

### Phase 5: Better SaaS Features

- Notifications and push notifications
- Multi-device sync
- Search improvements
- Admin/moderation tools
- Analytics and product monitoring
- Billing/subscription model if needed

### Phase 6: App Expansion

- Make the web app installable as a PWA
- Wrap for desktop with Electron or Tauri if desktop app is needed
- For mobile, prefer a reuse-first approach like Capacitor before considering a bigger frontend rewrite

## Recommended Build Order

1. Fix current product issues first
2. Add local caching
3. Add offline draft + pending message queue
4. Add reconnect sync
5. Add PWA/desktop/mobile packaging
6. Add advanced SaaS features after the product is stable

## High-Priority Next Features

- Local message cache
- Offline indicator
- Pending/failed/sent message states
- Retry unsent messages on reconnect
- Sync and deduplication logic
- Better reconnect UX
- Stronger test coverage

## Product Direction

Best near-term direction:

- keep backend as source of truth
- make frontend offline-first
- sync on reconnect
- reuse current web code for desktop/mobile packaging later

This gives the fastest path to a serious SaaS product without rewriting the whole project.
