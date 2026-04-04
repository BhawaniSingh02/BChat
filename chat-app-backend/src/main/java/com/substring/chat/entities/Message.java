package com.substring.chat.entities;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.TextIndexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
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
    @TextIndexed
    private String content;
    private MessageType messageType = MessageType.TEXT;
    private String fileUrl;
    private List<String> readBy = new ArrayList<>();
    private Map<String, Instant> readAt = new HashMap<>(); // username -> read timestamp (Phase 22)
    private Instant timestamp;
    private boolean edited = false;
    private Instant editedAt;
    private boolean deleted = false;
    private Map<String, List<String>> reactions = new HashMap<>(); // emoji -> list of usernames

    // Phase 18 — Quote reply
    private String replyToId;       // ID of the message being replied to
    private String replyToSnippet;  // First 80 chars of quoted message content
    private String replyToSender;   // Sender username of the quoted message

    // Phase 18 — Forwarded messages
    private String forwardedFrom;   // Original sender username if this is a forward

    // Phase 19 — Message starring
    private List<String> starred = new ArrayList<>(); // usernames who starred

    // Phase 21 — Disappearing messages
    private Instant disappearsAt;

    // Phase 27 — Message Threads
    private String threadId;          // null = root message; set = this is a thread reply
    private int threadReplyCount = 0; // only set on root messages
    private Instant lastThreadReplyAt; // timestamp of most recent thread reply

    public Message(String sender, String senderName, String roomId, String content) {
        this.sender = sender;
        this.senderName = senderName;
        this.roomId = roomId;
        this.content = content;
        this.messageType = MessageType.TEXT;
        this.timestamp = Instant.now();
    }

    public enum MessageType {
        TEXT, IMAGE, FILE, VIDEO, AUDIO
    }
}
