package com.substring.chat.entities;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

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
    private LocalDateTime createdAt;
    private LocalDateTime lastSeen;
}
