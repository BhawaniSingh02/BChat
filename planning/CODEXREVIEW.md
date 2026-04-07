# Call Feature Review

## Main Issues Summary

- Outgoing call state is incomplete on the caller side, so ringing calls cannot be cancelled cleanly and early ICE candidates are dropped.
- Busy-call protection is only checked per conversation, not per user, so a user can be interrupted by calls from another conversation.
- Ended or rejected call sessions can still be answered and turned back into active calls.
- Missed-call messages are saved, but not pushed through the live DM channel, so users may not see them immediately.
- Voice-message sending has backend/frontend quality issues: wrong oversized-audio error text and an `AudioContext` leak in the recorder.
- Conversation settings are incomplete/inaccurate: DM archive is implemented but not exposed, and temporary mute expiry is not interpreted correctly in the UI.
- The startup “Connecting to server…” banner is placed inside the chat content flow, which hurts first-load UX.

## Findings

### 1. Outgoing calls cannot be cancelled correctly, and early caller ICE candidates are dropped
Severity: High

Files:
- [chat-app-frontend/src/store/callStore.ts](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-frontend\src\store\callStore.ts#L47)
- [chat-app-frontend/src/pages/ChatPage.tsx](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-frontend\src\pages\ChatPage.tsx#L99)
- [chat-app-backend/src/main/java/com/substring/chat/services/CallService.java](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-backend\src\main\java\com\substring\chat\services\CallService.java#L61)

The caller never learns the `callSessionId` when a call is initiated. `startOutgoingCall()` explicitly stores `callSessionId: null`, and the client only gets a session id later from `CALL_ANSWERED`. Until that happens:

- `onIceCandidate` refuses to send caller ICE candidates because it requires both `callSessionId` and `callConvId`.
- `handleHangUp()` also refuses to send `/app/call.end/...` while the call is still ringing, because it has no session id to target.

That means a caller can dismiss the UI locally without actually cancelling the server-side ringing session, and the callee can keep seeing an incoming call that no longer exists on the caller’s screen. It also means any ICE candidates emitted before the answer are silently dropped, which can break connection establishment on stricter networks.

### 2. Busy protection is per conversation, not per user, so a user can be called again while already in another call
Severity: High

Files:
- [chat-app-backend/src/main/java/com/substring/chat/services/CallService.java](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-backend\src\main\java\com\substring\chat\services\CallService.java#L44)
- [chat-app-backend/src/main/java/com/substring/chat/controllers/CallSignalingController.java](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-backend\src\main\java\com\substring\chat\controllers\CallSignalingController.java#L61)
- [chat-app-frontend/src/store/callStore.ts](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-frontend\src\store\callStore.ts#L57)
- [chat-app-frontend/src/pages/ChatPage.tsx](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-frontend\src\pages\ChatPage.tsx#L123)

The backend “busy” check only looks for `RINGING` or `ACTIVE` calls in the same `conversationId`. It does not check whether either participant is already busy in some other conversation. The controller comment says “callee is already on another call”, but the actual query does not enforce that.

On the frontend, `INCOMING_CALL` always overwrites the current call store state. So if a user is already in an active call and another conversation calls them, the new event can replace the existing call session in the UI rather than being rejected with a busy signal.

This is a cross-conversation corruption bug, not just a UI annoyance.

### 3. A call session can be answered after it has already been ended or rejected
Severity: High

Files:
- [chat-app-backend/src/main/java/com/substring/chat/services/CallService.java](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-backend\src\main\java\com\substring\chat\services\CallService.java#L77)
- [chat-app-backend/src/main/java/com/substring/chat/services/CallService.java](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-backend\src\main\java\com\substring\chat\services\CallService.java#L135)
- [chat-app-frontend/src/pages/ChatPage.tsx](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-frontend\src\pages\ChatPage.tsx#L305)

`answerCall()` validates only participant membership and conversation id, then unconditionally flips the session to `ACTIVE`. There is no guard that the session is still `RINGING`. If the caller already cancelled, or the callee already rejected once, a delayed answer can still resurrect the call in persistence and notify the caller with `CALL_ANSWERED`.

This is especially risky because the caller-side cancellation path is already weak due to the missing session id. Together, these two issues make call state races very likely.

### 4. Missed-call messages are persisted but not pushed through the live DM channel
Severity: Medium

Files:
- [chat-app-backend/src/main/java/com/substring/chat/services/CallService.java](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-backend\src\main\java\com\substring\chat\services\CallService.java#L152)
- [chat-app-backend/src/main/java/com/substring/chat/services/CallService.java](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-backend\src\main\java\com\substring\chat\services\CallService.java#L204)
- [chat-app-frontend/src/hooks/useWebSocket.ts](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-frontend\src\hooks\useWebSocket.ts#L70)

When a ringing caller ends the call, `postMissedCallMessage()` only writes a `Message` document. It does not publish that message to `/user/queue/messages`, and it does not appear to update DM metadata such as last-message timestamps.

The frontend’s live DM updates rely on `/user/queue/messages`, so this missed-call entry will not appear in real time for the other participant unless some separate refresh happens later. That undermines one of the main user-facing outcomes of the call feature.

### 5. Oversized voice-message uploads return the wrong error text
Severity: Medium

Files:
- [chat-app-backend/src/main/java/com/substring/chat/controllers/FileUploadController.java](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-backend\src\main\java\com\substring\chat\controllers\FileUploadController.java#L80)

The backend correctly gives audio uploads a 25 MB limit, but the error message for files over that limit still says the file exceeded the limit for "images and documents". The ternary used in the response text only distinguishes video vs everything else.

That means a failed voice-message send will surface misleading guidance to the user even though the audio-specific limit is implemented.

### 6. Each voice recording creates an `AudioContext` that is never closed
Severity: Medium

Files:
- [chat-app-frontend/src/components/chat/VoiceRecorder.tsx](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-frontend\src\components\chat\VoiceRecorder.tsx#L45)
- [chat-app-frontend/src/components/chat/VoiceRecorder.tsx](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-frontend\src\components\chat\VoiceRecorder.tsx#L140)

`VoiceRecorder` creates a fresh `AudioContext` for waveform analysis every time recording starts, but it never stores or closes that context on successful send, cancel, or unmount. Tracks are stopped, but the audio graph itself is left alive.

With repeated voice-message usage, this can leak audio resources and eventually make the recorder less reliable on browsers that limit concurrent `AudioContext` instances.

### 7. Conversation archive exists in the API/backend but is not available from chat settings
Severity: Medium

Files:
- [chat-app-frontend/src/components/chat/ConversationSettingsModal.tsx](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-frontend\src\components\chat\ConversationSettingsModal.tsx#L45)
- [chat-app-frontend/src/api/messages.ts](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-frontend\src\api\messages.ts#L31)
- [chat-app-backend/src/main/java/com/substring/chat/controllers/DirectMessageController.java](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-backend\src\main\java\com\substring\chat\controllers\DirectMessageController.java#L96)
- [chat-app-backend/src/main/java/com/substring/chat/services/ConversationService.java](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-backend\src\main\java\com\substring\chat\services\ConversationService.java#L47)

The DM conversation settings modal only exposes mute, disappearing messages, and block/unblock. But both frontend API helpers and backend endpoints/services also implement `archive` and `unarchive` for direct conversations.

So archive is a shipped backend capability that users cannot actually reach from the conversation settings UI. If archive is meant to be part of “Conversation Settings”, this is an incomplete feature rather than a missing enhancement.

### 8. Temporary mute expiry is not interpreted, so expired mutes can remain shown as active
Severity: Medium

Files:
- [chat-app-frontend/src/components/chat/ConversationSettingsModal.tsx](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-frontend\src\components\chat\ConversationSettingsModal.tsx#L42)
- [chat-app-frontend/src/components/chat/DMChatView.tsx](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-frontend\src\components\chat\DMChatView.tsx#L59)
- [chat-app-backend/src/main/java/com/substring/chat/services/ConversationService.java](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-backend\src\main\java\com\substring\chat\services\ConversationService.java#L31)

Temporary mute is stored as an `Instant`, but both the settings modal and DM header derive `isMuted` using only `!!conversation.mutedBy?.[currentUsername]`. There is no check that the stored mute-until timestamp is still in the future.

That means an `8H` or `1W` mute can keep rendering as muted after it has already expired, unless some other path explicitly removes that entry from the conversation document. I did not find expiry cleanup in the conversation service either; it only writes and removes mute entries manually.

### 9. The server-connection loading banner is injected into the chat content area, producing awkward layout
Severity: Low

Files:
- [chat-app-frontend/src/pages/ChatPage.tsx](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-frontend\src\pages\ChatPage.tsx#L365)

The “Connecting to server…” banner is rendered inside the `<main>` chat panel, before the actual chat body. In practice that places it between the chat header/chrome and the message area, which matches the odd in-between placement you noticed.

This is more of a UX/layout bug than a functional defect, but it does make startup feel broken because the banner looks like it is interrupting the conversation rather than representing an app-level status. It would be cleaner as a global top bar, a header-adjacent status chip, or an overlay tied to the panel shell instead of inserted into the content flow.

### 10. Voice recorder auto-stop at max duration does not run the send/upload flow
Severity: Medium

Files:
- [chat-app-frontend/src/components/chat/VoiceRecorder.tsx](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-frontend\src\components\chat\VoiceRecorder.tsx#L72)
- [chat-app-frontend/src/components/chat/VoiceRecorder.tsx](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-frontend\src\components\chat\VoiceRecorder.tsx#L99)

When the recorder reaches `MAX_DURATION_SECONDS`, the interval directly calls `recorder.stop()`. But the upload/send logic only exists inside `stopAndUpload()`, which assigns `recorder.onstop` immediately before stopping.

So the auto-stop path does not actually upload the audio or invoke `onSend`. In the worst case it can leave the recorder UI in an inconsistent “still recording” state because `recording` is only cleared inside the explicit send flow.

### 11. Block/unblock from conversation settings closes the modal immediately, even if the action fails
Severity: Low

Files:
- [chat-app-frontend/src/components/chat/ConversationSettingsModal.tsx](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-frontend\src\components\chat\ConversationSettingsModal.tsx#L156)

The block and unblock buttons call `onBlock`/`onUnblock` and then immediately call `onClose()` without awaiting success. In `DMChatView`, those handlers are async and swallow failures.

That means if the network request fails, the modal still closes and the user gets no error state or confirmation that the privacy change did not actually happen.

### 12. Video-call “full screen” mode is not a very user-friendly fullscreen/minimize experience
Severity: Low

Files:
- [chat-app-frontend/src/components/call/ActiveCallView.tsx](c:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-frontend\src\components\call\ActiveCallView.tsx#L31)

The current fullscreen behavior mixes two different ideas:

- `isFullScreen` also drives a CSS-only `fixed inset-0` mode, so on mobile the view starts in a fullscreen-looking state without actually entering browser fullscreen.
- The actual layout is not reworked for fullscreen use. Even in “fullscreen”, the remote video area still uses a fixed `h-48`, so the call does not really take advantage of the available screen space.
- There is only one fullscreen toggle button; there is no separate minimize/return-to-floating affordance, which makes the control model feel unclear.

So the feature technically exists, but the UX is awkward: it looks partly fullscreen, partly floating-window, and the control semantics are not very obvious to the user.










## Open Questions

- I did not find a separate server-side timeout or janitor for stale `RINGING` sessions. If none exists, the missing caller cancellation path is even more damaging.
- The review assumes call features are DM-only, which matches the code paths I found.

## Verification Notes

- Frontend call-related code, store, hooks, UI, and tests were reviewed directly.
- Backend signaling/service/history code and associated tests were reviewed directly.
- I could not complete automated test execution in this environment:
  - `vitest` startup failed under the sandbox because Vite/Tailwind native dependencies could not be loaded and a child-process spawn returned `EPERM`.
  - Gradle could not download its wrapper distribution because outbound network access is blocked in the sandbox.
