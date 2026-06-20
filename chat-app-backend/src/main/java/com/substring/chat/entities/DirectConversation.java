package com.substring.chat.entities;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Document(collection = "direct_conversations")
@CompoundIndex(name = "participants_idx", def = "{'participants': 1}", unique = true)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DirectConversation {

    @Id
    private String id;

    private List<String> participants; // exactly two usernames

    private Instant createdAt;
    private Instant lastMessageAt;

    // Denormalized preview of the most recent message, so the conversation list can
    // show "last message" snippets without loading messages for every chat (scales to
    // large inboxes). Updated whenever a message is sent.
    private String lastMessagePreview;   // text content, or a media label like "📷 Photo"
    private String lastMessageType;      // TEXT | IMAGE | FILE | AUDIO | VIDEO
    private String lastMessageSender;    // opaque username of the sender

    // Message requests (Instagram-style). ACCEPTED = normal chat; PENDING = the
    // recipient hasn't accepted the initiator's first message yet (shows in their
    // Requests inbox). Defaults to ACCEPTED so existing conversations are unaffected.
    private String status = "ACCEPTED";   // ACCEPTED | PENDING
    private String initiatedBy;           // username (opaque id) of the requester, when PENDING

    // Phase 20 — Mute & Archive
    private Map<String, Instant> mutedBy = new HashMap<>();  // username -> muted until (null = forever)
    private List<String> archivedBy = new ArrayList<>();      // usernames who archived this conversation

    // Phase 21 — Disappearing messages
    private String disappearingMessagesTimer = "OFF"; // OFF | 24H | 7D | 90D
}
