package com.substring.chat.entities;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * An Expo push token for a mobile device. Sibling to {@link PushSubscription},
 * which covers browser Web Push — mobile uses a different delivery channel
 * (Expo's push service, which fans out to FCM/APNs) so it gets its own token type.
 * One user may have several (one per device).
 */
@Document(collection = "mobile_push_tokens")
@Getter @Setter @NoArgsConstructor
public class MobilePushToken {
    @Id private String id;
    @Indexed private String username;
    @Indexed(unique = true) private String expoPushToken;
    private String platform;
    private Instant createdAt;
}
