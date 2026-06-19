package com.substring.chat.entities;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * A browser Web Push subscription for a user/device. One user may have several
 * (one per browser/device). Identified uniquely by its push {@code endpoint}.
 */
@Document(collection = "push_subscriptions")
@Getter @Setter @NoArgsConstructor
public class PushSubscription {
    @Id private String id;
    @Indexed private String username;
    @Indexed(unique = true) private String endpoint;
    /** Client public key (base64url) used to encrypt the payload. */
    private String p256dh;
    /** Client auth secret (base64url). */
    private String auth;
    private Instant createdAt;
}
