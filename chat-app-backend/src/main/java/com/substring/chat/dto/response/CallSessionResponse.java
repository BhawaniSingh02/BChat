package com.substring.chat.dto.response;

import com.substring.chat.entities.CallSession;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@Builder
public class CallSessionResponse {

    private String id;
    private String conversationId;
    private String callerId;
    private String calleeId;
    private String callType;
    private String status;
    private Instant startedAt;
    private Instant answeredAt;
    private Instant endedAt;
    private int durationSeconds;

    public static CallSessionResponse from(CallSession session) {
        return CallSessionResponse.builder()
                .id(session.getId())
                .conversationId(session.getConversationId())
                .callerId(session.getCallerId())
                .calleeId(session.getCalleeId())
                .callType(session.getCallType() != null ? session.getCallType().name() : null)
                .status(session.getStatus() != null ? session.getStatus().name() : null)
                .startedAt(session.getStartedAt())
                .answeredAt(session.getAnsweredAt())
                .endedAt(session.getEndedAt())
                .durationSeconds(session.getDurationSeconds())
                .build();
    }
}
