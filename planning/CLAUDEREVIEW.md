# CLAUDEREVIEW.md — Verified Codebase Audit

This file is a ground-truth review written after reading every file referenced in CODEXREVIEW.md.
Each finding is confirmed, corrected, or refined with exact line numbers.
New issues discovered during verification are marked **[NEW]**.

---

## Verdict on CODEXREVIEW.md

All 12 original findings are **confirmed correct**. No finding is false.
Two findings needed refinement (Issues 9 and 12).
Two new issues were discovered during verification.

---

## Confirmed & Refined Findings

---

### 1. Outgoing calls cannot be cancelled correctly, and early caller ICE candidates are dropped
**Severity: High** | **Status: ✅ Fixed (Phase A)**

**Files:**
- `chat-app-frontend/src/store/callStore.ts:47–55`
- `chat-app-frontend/src/pages/ChatPage.tsx:100–103, 325–332`
- `chat-app-backend/src/main/java/com/substring/chat/controllers/CallSignalingController.java:50–71`

**Root cause (clarified):**
`startOutgoingCall()` in `callStore.ts:53` explicitly sets `callSessionId: null`. The server's `handleOffer` handler (`CallSignalingController.java:50–71`) calls `callService.initiateCall()` but **discards the returned `CallSession` entirely** — no acknowledgment event is sent back to the caller. The caller only learns the `callSessionId` when the callee answers (`CALL_ANSWERED` event), at which point `callAnswered()` in `callStore.ts:67–72` sets it via `prev.callSessionId ?? event.callSessionId`.

While `callSessionId` is `null` (the entire ringing phase):

- `onIceCandidate` guard at `ChatPage.tsx:101` — `if (callSessionId && callConvId)` — silently drops every ICE candidate.
- `handleHangUp` guard at `ChatPage.tsx:326` — `if (callSessionId && callConvId)` — sends no end signal to the server. The caller's UI dismisses locally while the server-side `RINGING` session persists indefinitely.
- The callee continues receiving the call notification for a call the caller has already discarded.

**Fix required:**
`handleOffer` must send an acknowledgment event (e.g. `CALL_INITIATED`) back to the caller containing the new `callSessionId`. Alternatively, add a separate `call.cancel/{conversationId}` STOMP endpoint that the caller can invoke with only `conversationId` (no session ID needed) to terminate any active ringing session for that conversation.

---

### 2. Busy protection is per conversation, not per user
**Severity: High** | **Status: ✅ Fixed (Phase A)**

**Files:**
- `chat-app-backend/src/main/java/com/substring/chat/services/CallService.java:44–49`
- `chat-app-backend/src/main/java/com/substring/chat/controllers/CallSignalingController.java:61–68`
- `chat-app-frontend/src/store/callStore.ts:57–65`

**Details:**
`CallService.java:44–49` queries `callSessionRepository.findByConversationIdAndStatusIn(conversationId, ...)` — the busy check is scoped to a single `conversationId`. If either participant is on a call in a **different** conversation, a new call from a third conversation goes through.

The controller comment at `CallSignalingController.java:62` says "Callee is already on another call" but the caught `IllegalStateException` is only thrown for the **same** conversation, not for other conversations. The comment is misleading.

On the frontend, `receiveIncomingCall` in `callStore.ts:57–65` unconditionally overwrites the entire call store state, including overwriting an active call's `callSessionId`, `conversationId`, and `otherUsername`. This is a silent session corruption, not just a UI overlap.

**Fix required:**
Backend: query `callSessionRepository.findByCallerIdOrCalleeIdAndStatusIn(callerUsername, calleeUsername, [RINGING, ACTIVE])` across all conversations to check if either party is busy globally.
Frontend: guard `receiveIncomingCall` — if `callState !== 'idle'`, do not overwrite; instead immediately emit a `CALL_BUSY` response back through the WebSocket.

---

### 3. A call session can be answered after it has already been ended or rejected
**Severity: High** | **Status: ✅ Fixed (Phase A)**

**Files:**
- `chat-app-backend/src/main/java/com/substring/chat/services/CallService.java:77–100`

**Details:**
`answerCall()` at `CallService.java:79–86` fetches the session, calls `validateParticipant()` (only checks participant names and conversationId), then unconditionally executes:
```java
session.setStatus(CallSession.CallStatus.ACTIVE);
session.setAnsweredAt(Instant.now());
```
There is **no guard checking** `session.getStatus() == CallSession.CallStatus.RINGING`.

If the caller already cancelled (session is `MISSED`) or the callee previously rejected (session is `REJECTED`), a delayed answer packet still resurrects the session to `ACTIVE` and sends a `CALL_ANSWERED` event to the caller. Combined with Issue 1 (caller can't cancel cleanly), the likelihood of this race is high.

**Fix required:**
Add an explicit status check at the top of `answerCall`:
```java
if (session.getStatus() != CallSession.CallStatus.RINGING) {
    throw new IllegalStateException("Call session is no longer ringing: " + callSessionId);
}
```

---

### 4. Missed-call messages are persisted but not pushed through the live DM channel
**Severity: Medium** | **Status: ✅ Fixed (Phase B)**

**Files:**
- `chat-app-backend/src/main/java/com/substring/chat/services/CallService.java:204–214`

**Details:**
`postMissedCallMessage()` at `CallService.java:204–214` only calls `messageRepository.save(msg)`. It does not call `messagingTemplate.convertAndSendToUser(...)`. The missed call entry is stored in MongoDB but never delivered to the callee's live `/user/queue/messages` subscription. The callee will only see it after a manual page refresh or reconnect.

Additionally, neither the DM conversation's `lastMessage` field nor its `updatedAt`/unread counters are updated when the missed-call message is saved. So even the sidebar "last message" preview remains stale.

**Fix required:**
After saving, publish the message to the callee's queue:
```java
messagingTemplate.convertAndSendToUser(
    session.getCalleeId(), "/queue/messages", MessageResponse.from(msg));
```
Also update the `DirectConversation` document's `lastMessage` and `updatedAt` fields, mirroring what the normal DM send path does.

---

### 5. Oversized voice-message uploads return the wrong error text
**Severity: Medium** | **Status: ✅ Fixed (Phase C)**

**Files:**
- `chat-app-backend/src/main/java/com/substring/chat/controllers/FileUploadController.java:80–85`

**Details:**
Line 84:
```java
String.format("File exceeds the %d MB limit for %s.", limitMb,
    isVideo ? "videos" : "images and documents")
```
The ternary only branches on `isVideo`. Audio files hit the `else` arm and receive the message "images and documents", which is wrong. `MAX_AUDIO_SIZE` is a distinct limit (25 MB) for a distinct file type (voice messages), so users get misleading guidance when a voice message upload fails.

**Fix required:**
```java
String category = isVideo ? "videos" : isAudio ? "voice messages" : "images and documents";
```

---

### 6. Each voice recording creates an `AudioContext` that is never closed
**Severity: Medium** | **Status: ✅ Fixed (Phase B)**

**Files:**
- `chat-app-frontend/src/components/chat/VoiceRecorder.tsx:46, 99–126, 128–138, 141–146`

**Details:**
`startRecording()` at line 46 creates `const audioCtx = new AudioContext()`. This variable is **local to the function** — it is never stored in a ref. There is no way to close it afterward.

- `stopAndUpload()` (line 99): stops tracks in `onstop` callback, never touches `audioCtx`.
- `handleCancel()` (line 128): stops tracks, never touches `audioCtx`.
- Unmount cleanup (line 141): only stops tracks and clears timers, never closes `audioCtx`.

The `AnalyserNode` is stored in `analyserRef`, but `AnalyserNode.disconnect()` alone does not close the owning `AudioContext`. Browsers allow a maximum of ~6 concurrent `AudioContext` instances; leaking one per recording session causes eventual recorder failure.

**Fix required:**
Store `audioCtx` in a ref (`audioCtxRef`) and call `audioCtxRef.current?.close()` in all three exit paths (`onstop`, `handleCancel`, unmount cleanup).

---

### 7. Conversation archive is implemented in the backend but not exposed in the settings UI
**Severity: Medium** | **Status: ✅ Fixed (Phase C)**

**Files:**
- `chat-app-frontend/src/components/chat/ConversationSettingsModal.tsx` (full file — no archive UI)
- `chat-app-backend/src/main/java/com/substring/chat/controllers/DirectMessageController.java:96`
- `chat-app-backend/src/main/java/com/substring/chat/services/ConversationService.java:47`

**Details:**
`ConversationSettingsModal.tsx` renders three sections: Notifications (mute), Disappearing Messages, and Privacy (block/unblock). There is no archive section. Both the backend endpoint (`DirectMessageController.java:96`) and service (`ConversationService.java:47`) implement archive/unarchive logic. The frontend `messagesApi` also contains `archiveDM`/`unarchiveDM` helper functions.

This is a completed backend feature with no user-facing access point. It is not a missing enhancement — it is an incomplete feature.

**Fix required:**
Add an "Archive Conversation" section to `ConversationSettingsModal.tsx` between Disappearing Messages and Privacy, wired to `messagesApi.archiveDM` / `messagesApi.unarchiveDM`.

---

### 8. Temporary mute expiry is not checked — expired mutes remain displayed as active
**Severity: Medium** | **Status: ✅ Fixed (Phase C)**

**Files:**
- `chat-app-frontend/src/components/chat/ConversationSettingsModal.tsx:42`
- `chat-app-frontend/src/components/chat/DMChatView.tsx:59`
- `chat-app-backend/src/main/java/com/substring/chat/services/ConversationService.java:31`

**Details:**
Both files derive `isMuted` identically:
```ts
const isMuted = !!conversation.mutedBy?.[currentUsername]
```
The `mutedBy` map stores an `Instant` (the mute-until timestamp) but the frontend checks only existence, not whether the timestamp is still in the future.

An `8H` mute set on Monday will still display as "Muted — tap to unmute" on Tuesday. No backend expiry cleanup was found in `ConversationService` — there is no scheduled job or lazy expiry check that removes the `mutedBy` entry after its timestamp passes.

**Fix required:**
Frontend: replace the `isMuted` derivation with an expiry check:
```ts
const muteUntil = conversation.mutedBy?.[currentUsername]
const isMuted = muteUntil != null && (muteUntil === 'ALWAYS' || new Date(muteUntil) > new Date())
```
Backend: either add a scheduled cleanup job, or perform a lazy expiry check in `ConversationService` when fetching conversation data.

---

### 9. Server-connection loading banner is injected into the chat content flow
**Severity: Low** | **Status: ✅ Fixed (Phase C)**

**Files:**
- `chat-app-frontend/src/pages/ChatPage.tsx:385–391`

**Details (refined):**
The CODEX review was correct but slightly imprecise. The banner IS inside `<main>` (the chat panel), but it is rendered **before** the inner `<div className="flex flex-1 flex-col ...">` wrapper that contains the actual chat view. It stacks vertically as a sibling to the chat content, not nested inside it. The practical visual result is the same: the banner appears wedged between the chat header/chrome and the message list, making it look like an interruption to the conversation rather than a global app-level status.

The `apiError` banner directly above it (line 372) has the same placement issue.

**Fix required:**
Lift both banners to a position outside `<main>`, such as a fixed top bar (`fixed top-0 inset-x-0 z-40`), or move them into the top of the `<Sidebar>` area where they read as app-level status rather than chat content.

---

### 10. Voice recorder auto-stop at max duration does not run the send/upload flow
**Severity: Medium** | **Status: ✅ Fixed (Phase B)**

**Files:**
- `chat-app-frontend/src/components/chat/VoiceRecorder.tsx:73–80, 99–126`

**Details:**
The auto-stop timer at line 76–79 calls `recorder.stop()` directly:
```ts
if (secs >= MAX_DURATION_SECONDS) {
  recorder.stop()
}
```
The `recorder.onstop` handler that performs the upload is **only assigned inside `stopAndUpload()`** at line 106, immediately before `recorder.stop()` is called there. In the auto-stop code path, `onstop` is never assigned, so when the recorder fires its `stop` event, there is no handler — the audio chunks are silently discarded.

Additionally, `recording` state is set to `false` inside `onstop` (line 112 in `stopAndUpload`), which is never reached in the auto-stop path. This leaves `recording === true` indefinitely, keeping the send button disabled (line 223: `disabled={!recording || uploading}`).

The user sees a frozen "still recording" UI with no way to proceed.

**Fix required:**
Replace the direct `recorder.stop()` in the timer callback with a call to `stopAndUpload()`:
```ts
if (secs >= MAX_DURATION_SECONDS) {
  stopAndUpload()
}
```

---

### 11. Block/unblock closes the modal immediately without awaiting network success
**Severity: Low** | **Status: ✅ Fixed (Phase C)**

**Files:**
- `chat-app-frontend/src/components/chat/ConversationSettingsModal.tsx:162, 173`

**Details:**
Both click handlers fire-and-forget:
```tsx
onClick={() => { onUnblock?.(otherUsername); onClose() }}
onClick={() => { onBlock?.(otherUsername);   onClose() }}
```
`onClose()` is called synchronously in the same tick. In `DMChatView`, the block/unblock handlers are `async` and internally swallow errors with empty `catch` blocks. If the network request fails, the modal has already closed, the user sees no error, and the local `isBlocked` state may be out of sync with the server.

**Fix required:**
`await` the handler before closing, and display an error if it throws:
```tsx
onClick={async () => {
  try {
    await onUnblock?.(otherUsername)
    onClose()
  } catch {
    setError('Failed to unblock user')
  }
}}
```

---

### 12. Video-call fullscreen UX is inconsistent — mobile starts in CSS-only fake fullscreen
**Severity: Low** | **Status: ✅ Fixed (Phase C) — sub-issue (b) resolved; sub-issue (a) intentionally deferred**

**Files:**
- `chat-app-frontend/src/components/call/ActiveCallView.tsx:26–31, 76–95, 100–112`

**Details (refined):**
The CODEX review is correct. Two separate issues exist:

**a) Mobile initial state uses CSS fullscreen, not browser fullscreen:**
```ts
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
const [isFullScreen, setIsFullScreen] = useState(isMobile && callType === 'VIDEO')
```
On mobile video calls, `isFullScreen` starts `true`, applying `fixed inset-0 rounded-none`. This mimics fullscreen visually but does NOT call `requestFullscreen()`. The `fullscreenchange` event listener at lines 91–95 is also not triggered, so this pseudo-fullscreen state is never reconciled with the browser's actual fullscreen API. Pressing the fullscreen button then calls `requestFullscreen()`, which is correct, but the initial state was never a real fullscreen.

**b) Video area has a fixed `h-48` that does not respond to fullscreen:**
The video container at line 112:
```tsx
<div className="relative w-full h-48 bg-gray-800">
```
`h-48` (192 px) is applied regardless of `isFullScreen`. In true browser fullscreen, the outer container fills the viewport but the video area remains 192 px tall, with the remaining space occupied by the info bar and controls. There is no layout variant for fullscreen.

**Fix required:**
- Remove the mobile initial `isFullScreen: true` hack; let all fullscreen be triggered by the button.
- Make the video div responsive: `className={isFullScreen ? 'relative w-full flex-1' : 'relative w-full h-48'}` and wrap the fullscreen container in `flex flex-col h-full`.

---

## New Issues Found During Verification

---

### 13. `CallSignalingController` carries both `@Controller` and `@RestController` — redundant and misleading
**Severity: Low** | **[NEW]** | **Status: ✅ Fixed (Phase A)**

**Files:**
- `chat-app-backend/src/main/java/com/substring/chat/controllers/CallSignalingController.java:38–39`

**Details:**
```java
@Controller
@RestController
@RequestMapping("/api/v1/calls")
```
`@RestController` is a composed annotation that already includes `@Controller` + `@ResponseBody`. Declaring both is redundant. While Spring handles this without runtime error, it is misleading: it implies the `@MessageMapping` methods (which should NOT be `@ResponseBody`) and the `@GetMapping` REST method (which should) are treated equally. In practice, `@MessageMapping` methods return `void` so `@ResponseBody` has no effect there, but the dual annotation is a code quality issue and a sign that the class was assembled incorrectly.

**Fix required:**
Remove `@Controller` — keep only `@RestController` (which covers the `@GetMapping` endpoint) and the `@MessageMapping` void methods will work correctly.

---

### 14. No server-side timeout or janitor for stale `RINGING` sessions
**Severity: Medium** | **[NEW]** | **Status: ✅ Fixed (Phase A)**

**Files:**
- `chat-app-backend/src/main/java/com/substring/chat/services/CallService.java` (entire file — no `@Scheduled` method present)
- `chat-app-backend/src/main/java/com/substring/chat/repositories/CallSessionRepository.java` (implied)

**Details:**
No `@Scheduled` job, TTL index, or cleanup mechanism was found for `CallSession` documents that remain in `RINGING` status indefinitely. This compounds Issue 1 (caller cannot cancel cleanly) and Issue 3 (sessions can be answered after rejection):

- If a caller's browser tab closes mid-ring without sending `call.end`, the session remains `RINGING` forever.
- While it persists, Issue 2's busy check will block any new call attempts for that `conversationId`.
- The callee may continue receiving the ringing notification if the WebSocket connection is still open.

**Fix required:**
Add a `@Scheduled(fixedRate = 60000)` cleanup job in `CallService` (or a dedicated `CallSessionCleanupService`) that queries for sessions with `status = RINGING` and `startedAt < Instant.now().minus(60, SECONDS)`, transitions them to `MISSED`, sends `CALL_ENDED` to both participants, and posts the missed-call message.

Alternatively, add a MongoDB TTL index on `startedAt` with a short expiry for `RINGING` sessions, though that approach is coarser-grained.

---

## Summary Table

| # | Title | Severity | Source | Status |
|---|-------|----------|--------|--------|
| 1 | Outgoing call cancel + caller ICE drop | High | CODEX | ✅ Fixed — Phase A |
| 2 | Busy check is per-conversation, not per-user | High | CODEX | ✅ Fixed — Phase A |
| 3 | Ended/rejected session can be re-answered | High | CODEX | ✅ Fixed — Phase A |
| 4 | Missed-call messages not pushed live | Medium | CODEX | ✅ Fixed — Phase B |
| 5 | Wrong error text for oversized audio upload | Medium | CODEX | ✅ Fixed — Phase C |
| 6 | `AudioContext` leak in VoiceRecorder | Medium | CODEX | ✅ Fixed — Phase B |
| 7 | Archive feature not exposed in settings UI | Medium | CODEX | ✅ Fixed — Phase C |
| 8 | Expired mutes still shown as active | Medium | CODEX | ✅ Fixed — Phase C |
| 9 | Connecting banner in chat content flow | Low | CODEX | ✅ Fixed — Phase C |
| 10 | Auto-stop at max duration skips upload | Medium | CODEX | ✅ Fixed — Phase B |
| 11 | Block/unblock closes modal without await | Low | CODEX | ✅ Fixed — Phase C |
| 12 | Fullscreen UX inconsistent on mobile | Low | CODEX | ✅ Fixed — Phase C (sub-issue b; sub-issue a deferred) |
| 13 | Dual `@Controller`+`@RestController` annotations | Low | NEW | ✅ Fixed — Phase A |
| 14 | No server-side timeout for stale RINGING sessions | Medium | NEW | ✅ Fixed — Phase A |

**Total: 14 issues — 3 High, 6 Medium, 5 Low**
**All 14 issues resolved across Phase A (5), Phase B (3), Phase C (6).**

---

## Open Questions (Inherited from CODEXREVIEW, now answered)

- **"Is there a server-side janitor for stale RINGING sessions?"** — Answered: **No.** Added as Issue 14 above.
- **"Are call features DM-only?"** — Confirmed: all controller paths use `conversationId` referencing `DirectConversation`. Room calls do not exist.
