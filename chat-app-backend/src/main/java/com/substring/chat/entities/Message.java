package com.substring.chat.entities;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Document(collection = "messages")
@CompoundIndexes({
    @CompoundIndex(name = "room_timestamp_idx", def = "{'roomId': 1, 'timestamp': -1}")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Message {

    @Id
    private String id;

    private String roomId;
    private String sender;
    private String senderName;
    private String content;
    private MessageType messageType = MessageType.TEXT;
    private String fileUrl;
    private List<String> readBy = new ArrayList<>();
    private LocalDateTime timestamp;
    private boolean edited = false;
    private LocalDateTime editedAt;
    private boolean deleted = false;
    private Map<String, List<String>> reactions = new HashMap<>(); // emoji -> list of usernames

    public Message(String sender, String senderName, String roomId, String content) {
        this.sender = sender;
        this.senderName = senderName;
        this.roomId = roomId;
        this.content = content;
        this.messageType = MessageType.TEXT;
        this.timestamp = LocalDateTime.now();
    }

    public enum MessageType {
        TEXT, IMAGE, FILE
    }
}
