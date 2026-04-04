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

    // Phase 20 — Mute & Archive
    private Map<String, Instant> mutedBy = new HashMap<>();  // username -> muted until (null = forever)
    private List<String> archivedBy = new ArrayList<>();      // usernames who archived this conversation

    // Phase 21 — Disappearing messages
    private String disappearingMessagesTimer = "OFF"; // OFF | 24H | 7D | 90D
}
