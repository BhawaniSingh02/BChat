package com.substring.chat.dto.request;

import com.substring.chat.entities.Message.MessageType;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SendDirectMessageRequest {

    @NotBlank(message = "Content is required")
    private String content;

    private MessageType messageType = MessageType.TEXT;

    private String fileUrl;
}
