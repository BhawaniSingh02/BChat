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

        // Reject if there's already an active/ringing call
        callSessionRepository.findByConversationIdAndStatusIn(
                conversationId, List.of(CallSession.CallStatus.RINGING, CallSession.CallStatus.ACTIVE))
                .ifPresent(existing -> {
                    throw new IllegalStateException("A call is already in progress for conversation " + conversationId);
                });

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
     * Callee answers the call — sends answer SDP back to caller.
     */
    public CallSession answerCall(String conversationId, String callSessionId,
                                  String calleeUsername, String sdpPayload) {
        CallSession session = callSessionRepository.findById(callSessionId)
                .orElseThrow(() -> new IllegalArgumentException("Call session not found: " + callSessionId));

        validateParticipant(session, calleeUsername, conversationId);

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

    private void postMissedCallMessage(CallSession session, String conversationId) {
        String icon = session.getCallType() == CallSession.CallType.VIDEO ? "📹" : "📞";
        Message msg = new Message();
        msg.setRoomId("dm:" + conversationId);
        msg.setSender(session.getCallerId());
        msg.setSenderName(session.getCallerId());
        msg.setContent(icon + " Missed " + session.getCallType().name().toLowerCase() + " call");
        msg.setMessageType(Message.MessageType.TEXT);
        msg.setTimestamp(Instant.now());
        messageRepository.save(msg);
    }
}
