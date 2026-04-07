package com.substring.chat.services;

import com.substring.chat.dto.response.CallEvent;
import com.substring.chat.entities.CallSession;
import com.substring.chat.repositories.CallSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Periodically cleans up zombie call sessions:
 * - RINGING sessions older than 90 s (caller closed browser / network drop before answer)
 * - ACTIVE sessions older than 4 h (both sides closed browser without hanging up)
 * Without this, stale sessions block the busy-check and prevent any new calls.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CallSessionJanitor {

    private static final long RINGING_TIMEOUT_SECONDS = 90;
    private static final long ACTIVE_TIMEOUT_HOURS    = 4;

    private final CallSessionRepository callSessionRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Scheduled(fixedDelay = 30_000) // run every 30 seconds
    public void expirestaleSessions() {
        expireByStatus(
                CallSession.CallStatus.RINGING,
                Instant.now().minus(RINGING_TIMEOUT_SECONDS, ChronoUnit.SECONDS),
                CallSession.CallStatus.MISSED);

        expireByStatus(
                CallSession.CallStatus.ACTIVE,
                Instant.now().minus(ACTIVE_TIMEOUT_HOURS, ChronoUnit.HOURS),
                CallSession.CallStatus.ENDED);
    }

    private void expireByStatus(CallSession.CallStatus fromStatus,
                                 Instant cutoff,
                                 CallSession.CallStatus toStatus) {
        List<CallSession> stale = callSessionRepository
                .findByStatusAndStartedAtBefore(fromStatus, cutoff);

        for (CallSession session : stale) {
            try {
                session.setStatus(toStatus);
                session.setEndedAt(Instant.now());
                callSessionRepository.save(session);

                CallEvent event = CallEvent.builder()
                        .eventType(CallEvent.EventType.CALL_ENDED.name())
                        .callSessionId(session.getId())
                        .conversationId(session.getConversationId())
                        .fromUsername("system")
                        .callType(session.getCallType().name())
                        .payload(null)
                        .build();
                messagingTemplate.convertAndSendToUser(session.getCallerId(), "/queue/call", event);
                messagingTemplate.convertAndSendToUser(session.getCalleeId(), "/queue/call", event);

                log.info("Janitor expired stale {} session {} → {} (started {})",
                        fromStatus, session.getId(), toStatus, session.getStartedAt());
            } catch (Exception e) {
                log.warn("Janitor failed to expire session {}: {}", session.getId(), e.getMessage());
            }
        }
    }
}
