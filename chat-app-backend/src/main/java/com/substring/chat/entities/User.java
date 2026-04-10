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
import java.util.List;

@Document(collection = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String username;

    @Indexed(unique = true)
    private String email;

    private String passwordHash;
    private String avatarUrl;
    private String displayName;
    private String bio;
    private String statusMessage;
    private String lastSeenPrivacy;   // EVERYONE | NOBODY | CONTACTS
    private String onlinePrivacy;     // EVERYONE | NOBODY
    private String profilePhotoPrivacy; // EVERYONE | NOBODY | CONTACTS
    private Instant createdAt;
    private Instant lastSeen;

    // Phase 23 — User blocking
    private List<String> blockedUsers = new ArrayList<>(); // list of blocked usernames

    // Security: account lockout
    private int failedLoginAttempts = 0;
    private Instant accountLockedUntil;

    // Security: email verification
    private boolean emailVerified = false;
    private String emailVerificationToken;
    private Instant emailVerificationExpiry;

    // Phase — Unique Handle & Contact Privacy
    @Indexed(unique = true, sparse = true)
    private String uniqueHandle;         // e.g. "alice.4821", immutable after set
    private String internalId;           // UUID, generated at creation, never exposed
    private String whoCanMessage = "APPROVED_ONLY"; // ANYONE | APPROVED_ONLY | NOBODY
}
