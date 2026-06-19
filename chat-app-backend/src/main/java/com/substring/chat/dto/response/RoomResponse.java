package com.substring.chat.dto.response;

import com.substring.chat.entities.Room;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Getter
@Setter
public class RoomResponse {

    private String id;
    private String roomId;
    private String name;
    private String description;
    private String createdBy;
    private List<String> members;
    private List<String> pinnedMessages;
    private Instant createdAt;
    private Instant lastMessageAt;
    private int memberCount;
    // Phase 20 — per-user mute (username -> muted until)
    private Map<String, Instant> mutedBy;

    public static RoomResponse from(Room room) {
        RoomResponse response = new RoomResponse();
        response.setId(room.getId());
        response.setRoomId(room.getRoomId());
        response.setName(room.getName());
        response.setDescription(room.getDescription());
        response.setCreatedBy(room.getCreatedBy());
        response.setMembers(room.getMembers());
        response.setPinnedMessages(room.getPinnedMessages() != null ? room.getPinnedMessages() : new java.util.ArrayList<>());
        response.setCreatedAt(room.getCreatedAt());
        response.setLastMessageAt(room.getLastMessageAt());
        response.setMemberCount(room.getMembers() != null ? room.getMembers().size() : 0);
        response.setMutedBy(room.getMutedBy() != null ? room.getMutedBy() : new HashMap<>());
        return response;
    }
}
