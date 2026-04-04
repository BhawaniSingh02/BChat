package com.substring.chat.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Generic signal payload for WebRTC signaling messages (offer, answer, ICE candidate).
 * The {@code payload} field carries the raw SDP or candidate JSON string.
 */
@Getter
@Setter
@NoArgsConstructor
public class CallSignalRequest {

    /** "AUDIO" or "VIDEO" — only used on the initial offer. */
    private String callType;

    /**
     * The raw signaling payload:
     * - For an offer/answer: an SDP description object serialised as JSON string.
     * - For an ICE candidate: the RTCIceCandidate object serialised as JSON string.
     */
    private String payload;
}
