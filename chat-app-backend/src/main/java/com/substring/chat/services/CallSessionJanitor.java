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
 * Periodically cleans up RINGING call sessions that were never answered or cancelled.
 * Prevents zombie sessions from blocking future calls between the same users.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CallSessionJanitor {

    /** A ringing call older than this is considered abandoned. */
    private static final long RINGING_TIMEOUT_SECONDS = 90;

    private final CallSessionRepository callSessionRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Scheduled(fixedDelay = 30_000) // run every 30 seconds
    public void expireStaleRingingSessions() {
        Instant cutoff = Instant.now().minus(RINGING_TIMEOUT_SECONDS, ChronoUnit.SECONDS);
        List<CallSession> stale = callSessionRepository
                .findByStatusAndStartedAtBefore(CallSession.CallStatus.RINGING, cutoff);

        for (CallSession session : stale) {
            try {
                session.setStatus(CallSession.CallStatus.MISSED);
                session.setEndedAt(Instant.now());
                callSessionRepository.save(session);

                // Notify both participants so their UIs can clean up
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

                log.info("Janitor expired stale RINGING session {} (started {})",
                        session.getId(), session.getStartedAt());
            } catch (Exception e) {
                log.warn("Janitor failed to expire session {}: {}", session.getId(), e.getMessage());
            }
        }
    }
}
