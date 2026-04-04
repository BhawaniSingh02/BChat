package com.substring.chat.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ForwardMessageRequest {

    /** Target room ID (for room forward) — mutually exclusive with conversationId */
    private String roomId;

    /** Target DM conversation ID (for DM forward) — mutually exclusive with roomId */
    private String conversationId;

    @NotBlank(message = "Either roomId or conversationId is required")
    private String targetId; // convenience: either roomId or conversationId
}
