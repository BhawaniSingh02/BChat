package com.substring.chat.dto.request;

import lombok.Getter;
import lombok.Setter;

/**
 * Mirrors the browser PushSubscription JSON:
 * { endpoint, keys: { p256dh, auth } }
 */
@Getter
@Setter
public class PushSubscriptionRequest {
    private String endpoint;
    private Keys keys;

    @Getter
    @Setter
    public static class Keys {
        private String p256dh;
        private String auth;
    }
}
