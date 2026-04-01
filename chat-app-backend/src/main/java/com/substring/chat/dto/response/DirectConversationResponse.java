package com.substring.chat.dto.response;

import com.substring.chat.entities.DirectConversation;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
public class DirectConversationResponse {

    private String id;
    private List<String> participants;
    private Instant createdAt;
    private Instant lastMessageAt;

    public static DirectConversationResponse from(DirectConversation conv) {
        DirectConversationResponse response = new DirectConversationResponse();
        response.setId(conv.getId());
        response.setParticipants(conv.getParticipants());
        response.setCreatedAt(conv.getCreatedAt());
        response.setLastMessageAt(conv.getLastMessageAt());
        return response;
    }
}
