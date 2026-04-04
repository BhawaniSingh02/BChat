package com.substring.chat.dto.request;

import com.substring.chat.entities.Message.MessageType;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SendMessageRequest {

    @NotBlank(message = "Content is required")
    private String content;

    private MessageType messageType = MessageType.TEXT;

    private String fileUrl;

    // Phase 18 — Quote reply
    private String replyToId;
    private String replyToSnippet;
    private String replyToSender;

    // Phase 18 — Forwarded message
    private String forwardedFrom;
}
