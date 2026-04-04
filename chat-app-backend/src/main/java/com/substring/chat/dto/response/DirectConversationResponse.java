package com.substring.chat.dto.response;

import com.substring.chat.entities.DirectConversation;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Getter
@Setter
public class DirectConversationResponse {

    private String id;
    private List<String> participants;
    private Instant createdAt;
    private Instant lastMessageAt;

    // Phase 20 — Mute & Archive
    private Map<String, Instant> mutedBy;
    private List<String> archivedBy;

    // Phase 21 — Disappearing messages
    private String disappearingMessagesTimer;

    public static DirectConversationResponse from(DirectConversation conv) {
        DirectConversationResponse response = new DirectConversationResponse();
        response.setId(conv.getId());
        response.setParticipants(conv.getParticipants());
        response.setCreatedAt(conv.getCreatedAt());
        response.setLastMessageAt(conv.getLastMessageAt());
        response.setMutedBy(conv.getMutedBy() != null ? conv.getMutedBy() : new HashMap<>());
        response.setArchivedBy(conv.getArchivedBy() != null ? conv.getArchivedBy() : new ArrayList<>());
        response.setDisappearingMessagesTimer(conv.getDisappearingMessagesTimer() != null
                ? conv.getDisappearingMessagesTimer() : "OFF");
        return response;
    }
}
