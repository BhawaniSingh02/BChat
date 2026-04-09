package com.substring.chat.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * WebSocket event sent over {@code /user/queue/call} to notify a user of a
 * call signaling event. The {@code eventType} distinguishes the event kind.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CallEvent {

    public enum EventType {
        /** Caller is initiating — callee sees incoming call overlay. */
        INCOMING_CALL,
        /** Ack sent back to the caller with the newly created callSessionId. */
        CALL_SESSION_CREATED,
        /** Callee accepted the call — establishes peer connection. */
        CALL_ANSWERED,
        /** ICE candidate exchange during negotiation. */
        ICE_CANDIDATE,
        /** One side hung up / rejected. */
        CALL_ENDED,
        /** Callee is already on another call — caller sees busy signal. */
        CALL_BUSY,
        /** One side toggled their microphone or camera — relay to the other peer for UI indicator. */
        MUTE_STATUS
    }

    /** The kind of event. */
    private String eventType;

    /** The call session ID — used to correlate events. */
    private String callSessionId;

    /** The conversation this call belongs to. */
    private String conversationId;

    /** Username of the user who triggered the event (caller or callee). */
    private String fromUsername;

    /** "AUDIO" or "VIDEO". */
    private String callType;

    /**
     * Raw SDP or ICE JSON payload (null for CALL_ENDED events).
     */
    private String payload;
}
