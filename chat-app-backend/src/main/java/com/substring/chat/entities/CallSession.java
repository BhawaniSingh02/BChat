package com.substring.chat.entities;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "call_sessions")
@CompoundIndexes({
    @CompoundIndex(name = "conversation_started_idx", def = "{'conversationId': 1, 'startedAt': -1}")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CallSession {

    @Id
    private String id;

    private String conversationId;   // DM conversation ID
    private String callerId;         // username of the caller
    private String calleeId;         // username of the callee

    private CallType callType;       // AUDIO | VIDEO
    private CallStatus status;       // RINGING | ACTIVE | ENDED | MISSED | REJECTED

    private Instant startedAt;       // when the call was initiated
    private Instant answeredAt;      // when the callee picked up
    private Instant endedAt;         // when the call ended

    private int durationSeconds;     // computed on end

    public enum CallType {
        AUDIO, VIDEO
    }

    public enum CallStatus {
        RINGING, ACTIVE, ENDED, MISSED, REJECTED
    }
}
