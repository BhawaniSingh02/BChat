package com.substring.chat.dto.response;

import com.substring.chat.entities.Message;
import com.substring.chat.entities.Message.MessageType;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Getter
@Setter
public class MessageResponse {

    private String id;
    private String roomId;
    private String sender;
    private String senderName;
    private String content;
    private MessageType messageType;
    private String fileUrl;
    private List<String> readBy;
    private Instant timestamp;
    private boolean edited;
    private Instant editedAt;
    private boolean deleted;
    private Map<String, List<String>> reactions;

    public static MessageResponse from(Message message) {
        MessageResponse response = new MessageResponse();
        response.setId(message.getId());
        response.setRoomId(message.getRoomId());
        response.setSender(message.getSender());
        response.setSenderName(message.getSenderName());
        response.setContent(message.getContent());
        response.setMessageType(message.getMessageType());
        response.setFileUrl(message.getFileUrl());
        response.setReadBy(message.getReadBy());
        response.setTimestamp(message.getTimestamp());
        response.setEdited(message.isEdited());
        response.setEditedAt(message.getEditedAt());
        response.setDeleted(message.isDeleted());
        response.setReactions(message.getReactions() != null ? message.getReactions() : new HashMap<>());
        return response;
    }
}
