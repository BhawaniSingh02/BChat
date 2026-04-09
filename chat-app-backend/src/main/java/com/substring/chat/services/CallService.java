package com.substring.chat.services;

import com.substring.chat.dto.response.CallEvent;
import com.substring.chat.dto.response.CallSessionResponse;
import com.substring.chat.entities.CallSession;
import com.substring.chat.entities.DirectConversation;
import com.substring.chat.entities.Message;
import com.substring.chat.exceptions.ConversationNotFoundException;
import com.substring.chat.repositories.CallSessionRepository;
import com.substring.chat.repositories.DirectConversationRepository;
import com.substring.chat.repositories.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CallService {

    private final CallSessionRepository callSessionRepository;
    private final DirectConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final PresenceService presenceService;

    // ── Signaling ────────────────────────────────────────────────────────────

    /**
     * Caller sends a WebRTC offer to the callee.
     * Creates a RINGING CallSession and forwards the offer to the callee.
     */
    public CallSession initiateCall(String conversationId, String callerUsername,
                                    String callType, String sdpPayload) {
        DirectConversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ConversationNotFoundException(conversationId));

        String calleeUsername = conv.getParticipants().stream()
                .filter(p -> !p.equals(callerUsername))
                .findFirst()
                .orElseThrow(() -> new ConversationNotFoundException(conversationId));

        expireOfflineSessionsForParticipant(callerUsername);
        expireOfflineSessionsForParticipant(calleeUsername);

        // Reject if either participant is already in any active or ringing call (across all conversations)
        List<CallSession.CallStatus> activeStatuses = List.of(CallSession.CallStatus.RINGING, CallSession.CallStatus.ACTIVE);
        callSessionRepository.findActiveCallByParticipant(callerUsername, activeStatuses)
                .ifPresent(s -> { throw new IllegalStateException("You are already in an active call"); });
        callSessionRepository.findActiveCallByParticipant(calleeUsername, activeStatuses)
                .ifPresent(s -> { throw new IllegalStateException(calleeUsername + " is already in an active call"); });

        CallSession session = new CallSession();
        session.setConversationId(conversationId);
        session.setCallerId(callerUsername);
        session.setCalleeId(calleeUsername);
        session.setCallType(CallSession.CallType.valueOf(callType.toUpperCase()));
        session.setStatus(CallSession.CallStatus.RINGING);
        session.setStartedAt(Instant.now());
        CallSession saved = callSessionRepository.save(session);

        // Notify callee of incoming call
        CallEvent event = CallEvent.builder()
                .eventType(CallEvent.EventType.INCOMING_CALL.name())
                .callSessionId(saved.getId())
                .conversationId(conversationId)
                .fromUsername(callerUsername)
                .callType(callType.toUpperCase())
                .payload(sdpPayload)
                .build();
        messagingTemplate.convertAndSendToUser(calleeUsername, "/queue/call", event);

        return saved;
    }

    /**
     * App-level calls cannot remain valid after a user disconnects from this app.
     * Clearing them immediately prevents false "on another call" busy signals later.
     */
    public void expireSessionsForDisconnectedUser(String username) {
        List<CallSession.CallStatus> activeStatuses = List.of(CallSession.CallStatus.RINGING, CallSession.CallStatus.ACTIVE);
        List<CallSession> sessions = callSessionRepository.findAllActiveCallsByParticipant(username, activeStatuses);

        for (CallSession session : sessions) {
            Instant now = Instant.now();
            boolean callerDisconnected = session.getCallerId().equals(username);
            boolean wasRinging = session.getStatus() == CallSession.CallStatus.RINGING;

            session.setEndedAt(now);
            if (wasRinging && callerDisconnected) {
                session.setStatus(CallSession.CallStatus.MISSED);
                postMissedCallMessage(session, session.getConversationId());
            } else if (wasRinging) {
                session.setStatus(CallSession.CallStatus.REJECTED);
            } else {
                session.setStatus(CallSession.CallStatus.ENDED);
                if (session.getAnsweredAt() != null) {
                    long secs = now.getEpochSecond() - session.getAnsweredAt().getEpochSecond();
                    session.setDurationSeconds((int) Math.max(0, secs));
                }
            }

            callSessionRepository.save(session);

            CallEvent event = CallEvent.builder()
                    .eventType(CallEvent.EventType.CALL_ENDED.name())
                    .callSessionId(session.getId())
                    .conversationId(session.getConversationId())
                    .fromUsername(username)
                    .callType(session.getCallType().name())
                    .payload(null)
                    .build();
            messagingTemplate.convertAndSendToUser(session.getCallerId(), "/queue/call", event);
            messagingTemplate.convertAndSendToUser(session.getCalleeId(), "/queue/call", event);
        }
    }

    /**
     * Callee answers the call — sends answer SDP back to caller.
     */
    public CallSession answerCall(String conversationId, String callSessionId,
                                  String calleeUsername, String sdpPayload) {
        CallSession session = callSessionRepository.findById(callSessionId)
                .orElseThrow(() -> new IllegalArgumentException("Call session not found: " + callSessionId));

        validateParticipant(session, calleeUsername, conversationId);

        if (session.getStatus() != CallSession.CallStatus.RINGING) {
            throw new IllegalStateException("Call session " + callSessionId + " is no longer ringing");
        }

        session.setStatus(CallSession.CallStatus.ACTIVE);
        session.setAnsweredAt(Instant.now());
        CallSession saved = callSessionRepository.save(session);

        // Forward answer SDP to caller
        CallEvent event = CallEvent.builder()
                .eventType(CallEvent.EventType.CALL_ANSWERED.name())
                .callSessionId(saved.getId())
                .conversationId(conversationId)
                .fromUsername(calleeUsername)
                .callType(session.getCallType().name())
                .payload(sdpPayload)
                .build();
        messagingTemplate.convertAndSendToUser(session.getCallerId(), "/queue/call", event);

        return saved;
    }

    /**
     * Exchange ICE candidates between the two peers.
     * The candidate is forwarded to the other participant.
     */
    public void relayIceCandidate(String conversationId, String callSessionId,
                                   String senderUsername, String candidatePayload) {
        CallSession session = callSessionRepository.findById(callSessionId)
                .orElseThrow(() -> new IllegalArgumentException("Call session not found: " + callSessionId));

        validateParticipant(session, senderUsername, conversationId);

        String targetUsername = session.getCallerId().equals(senderUsername)
                ? session.getCalleeId()
                : session.getCallerId();

        CallEvent event = CallEvent.builder()
                .eventType(CallEvent.EventType.ICE_CANDIDATE.name())
                .callSessionId(callSessionId)
                .conversationId(conversationId)
                .fromUsername(senderUsername)
                .callType(session.getCallType().name())
                .payload(candidatePayload)
                .build();
        messagingTemplate.convertAndSendToUser(targetUsername, "/queue/call", event);
    }

    /**
     * End or reject a call.
     * If the call was RINGING and the callee ends it → REJECTED.
     * If the call was RINGING and the caller ends it → MISSED (for the callee).
     * If the call was ACTIVE → ENDED.
     * A missed-call system message is sent when applicable.
     */
    public CallSession endCall(String conversationId, String callSessionId,
                               String senderUsername) {
        CallSession session = callSessionRepository.findById(callSessionId)
                .orElseThrow(() -> new IllegalArgumentException("Call session not found: " + callSessionId));

        validateParticipant(session, senderUsername, conversationId);

        Instant now = Instant.now();
        session.setEndedAt(now);

        boolean wasRinging = session.getStatus() == CallSession.CallStatus.RINGING;
        boolean callerEnded = session.getCallerId().equals(senderUsername);

        if (wasRinging && !callerEnded) {
            // Callee rejected
            session.setStatus(CallSession.CallStatus.REJECTED);
        } else if (wasRinging) {
            // Caller cancelled — it's a missed call for the callee
            session.setStatus(CallSession.CallStatus.MISSED);
            postMissedCallMessage(session, conversationId);
        } else {
            session.setStatus(CallSession.CallStatus.ENDED);
            if (session.getAnsweredAt() != null) {
                long secs = now.getEpochSecond() - session.getAnsweredAt().getEpochSecond();
                session.setDurationSeconds((int) Math.max(0, secs));
            }
        }

        CallSession saved = callSessionRepository.save(session);

        // Notify the other participant
        String targetUsername = callerEnded ? session.getCalleeId() : session.getCallerId();
        CallEvent event = CallEvent.builder()
                .eventType(CallEvent.EventType.CALL_ENDED.name())
                .callSessionId(saved.getId())
                .conversationId(conversationId)
                .fromUsername(senderUsername)
                .callType(session.getCallType().name())
                .payload(null)
                .build();
        messagingTemplate.convertAndSendToUser(targetUsername, "/queue/call", event);

        return saved;
    }

    /**
     * Caller cancels a ringing call using only the conversationId (before they have a session ID).
     * Safe to call even if the session no longer exists or is no longer RINGING.
     */
    public void cancelCallByConversation(String conversationId, String callerUsername) {
        callSessionRepository.findByConversationIdAndStatusIn(
                conversationId, List.of(CallSession.CallStatus.RINGING))
                .ifPresent(session -> {
                    if (!session.getCallerId().equals(callerUsername)) return; // not the caller, ignore
                    session.setStatus(CallSession.CallStatus.MISSED);
                    session.setEndedAt(Instant.now());
                    callSessionRepository.save(session);
                    postMissedCallMessage(session, conversationId);

                    CallEvent event = CallEvent.builder()
                            .eventType(CallEvent.EventType.CALL_ENDED.name())
                            .callSessionId(session.getId())
                            .conversationId(conversationId)
                            .fromUsername(callerUsername)
                            .callType(session.getCallType().name())
                            .payload(null)
                            .build();
                    messagingTemplate.convertAndSendToUser(session.getCalleeId(), "/queue/call", event);
                });
    }

    /**
     * Relay a mute/camera status toggle to the other participant.
     * Payload JSON: {@code {"kind":"audio","muted":true}} or {@code {"kind":"video","muted":true}}.
     */
    public void relayMuteStatus(String conversationId, String callSessionId,
                                 String senderUsername, String payload) {
        CallSession session = callSessionRepository.findById(callSessionId)
                .orElseThrow(() -> new IllegalArgumentException("Call session not found: " + callSessionId));

        validateParticipant(session, senderUsername, conversationId);

        String targetUsername = session.getCallerId().equals(senderUsername)
                ? session.getCalleeId()
                : session.getCallerId();

        CallEvent event = CallEvent.builder()
                .eventType(CallEvent.EventType.MUTE_STATUS.name())
                .callSessionId(callSessionId)
                .conversationId(conversationId)
                .fromUsername(senderUsername)
                .callType(session.getCallType().name())
                .payload(payload)
                .build();
        messagingTemplate.convertAndSendToUser(targetUsername, "/queue/call", event);
    }

    // ── Call history ─────────────────────────────────────────────────────────

    public List<CallSessionResponse> getCallHistory(String conversationId, String requestingUser) {
        conversationRepository.findById(conversationId)
                .filter(c -> c.getParticipants().contains(requestingUser))
                .orElseThrow(() -> new ConversationNotFoundException(conversationId));

        return callSessionRepository.findByConversationIdOrderByStartedAtDesc(conversationId)
                .stream()
                .map(CallSessionResponse::from)
                .toList();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void validateParticipant(CallSession session, String username, String conversationId) {
        if (!session.getCallerId().equals(username) && !session.getCalleeId().equals(username)) {
            throw new ConversationNotFoundException(conversationId);
        }
        if (!session.getConversationId().equals(conversationId)) {
            throw new ConversationNotFoundException(conversationId);
        }
    }

    private void expireOfflineSessionsForParticipant(String username) {
        if (presenceService.isOnline(username)) return;
        expireSessionsForDisconnectedUser(username);
    }

    private void postMissedCallMessage(CallSession session, String conversationId) {
        String icon = session.getCallType() == CallSession.CallType.VIDEO ? "📹" : "📞";
        Message msg = new Message();
        msg.setRoomId("dm:" + conversationId);
        msg.setSender(session.getCallerId());
        msg.setSenderName(session.getCallerId());
        msg.setContent(icon + " Missed " + session.getCallType().name().toLowerCase() + " call");
        msg.setMessageType(Message.MessageType.TEXT);
        msg.setTimestamp(Instant.now());
        Message saved = messageRepository.save(msg);
        // Push to both participants so their DM panels update in real-time
        messagingTemplate.convertAndSendToUser(session.getCallerId(), "/queue/messages", saved);
        messagingTemplate.convertAndSendToUser(session.getCalleeId(), "/queue/messages", saved);
    }
}
