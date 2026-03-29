package com.substring.chat.dto.response;

import com.substring.chat.entities.Room;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

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
    private LocalDateTime createdAt;
    private LocalDateTime lastMessageAt;
    private int memberCount;

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
        return response;
    }
}
