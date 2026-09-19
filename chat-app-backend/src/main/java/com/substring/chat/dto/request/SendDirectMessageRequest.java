package com.substring.chat.dto.request;

import com.substring.chat.entities.Message.MessageType;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class SendDirectMessageRequest {

    @NotBlank(message = "Content is required")
    private String content;

    // Client-generated id for optimistic-send reconciliation — echoed back in MessageResponse.
    private String clientId;

    private MessageType messageType = MessageType.TEXT;

    private String fileUrl;

    // Phase 18 — Quote reply
    private String replyToId;
    private String replyToSnippet;
    private String replyToSender;

    // Phase 18 — Forwarded message
    private String forwardedFrom;

    // Stories v3 — story reaction notification marker
    private String storyReactionEmoji;

    // Voice message polish — client-computed; server clamps to sane bounds before persisting (see ChatController)
    private Integer durationSeconds;
    private List<Integer> waveform;
}
