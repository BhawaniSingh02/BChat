package com.substring.chat.entities;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "refresh_tokens")
@Getter @Setter @NoArgsConstructor
public class RefreshToken {
    @Id private String id;
    @Indexed(unique = true) private String token;
    @Indexed private String username;
    private Instant expiresAt;
    private Instant createdAt;
    private String ipAddress;
    private String deviceInfo;
    private boolean revoked = false;
}
