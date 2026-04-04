package com.substring.chat.entities;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Document(collection = "rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Room {

    @Id
    private String id;

    @Indexed(unique = true)
    private String roomId;

    private String name;
    private String description;
    private String createdBy;
    private List<String> members = new ArrayList<>();
    private List<String> pinnedMessages = new ArrayList<>();
    private Instant createdAt;
    private Instant lastMessageAt;

    // Phase 20 — Mute & Archive
    private Map<String, Instant> mutedBy = new HashMap<>();  // username -> muted until
    private List<String> archivedBy = new ArrayList<>();      // usernames who archived this room
}
