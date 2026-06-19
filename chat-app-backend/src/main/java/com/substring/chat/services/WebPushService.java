package com.substring.chat.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.substring.chat.entities.PushSubscription;
import com.substring.chat.repositories.PushSubscriptionRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.Security;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Sends background Web Push notifications (VAPID) so users are notified even when
 * the app/tab is closed. Fully optional: if VAPID keys are not configured the
 * service is inert (no-ops) and the rest of the app is unaffected.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WebPushService {

    @Value("${vapid.public-key:}")
    private String publicKey;

    @Value("${vapid.private-key:}")
    private String privateKey;

    @Value("${vapid.subject:mailto:admin@baaat.app}")
    private String subject;

    private final PushSubscriptionRepository subscriptionRepository;
    private final ObjectMapper objectMapper;

    private PushService pushService;

    @PostConstruct
    void init() {
        if (!isConfigured()) {
            log.info("[WebPush] Disabled — set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY to enable background push.");
            return;
        }
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        try {
            pushService = new PushService(publicKey, privateKey, subject);
            log.info("[WebPush] Enabled.");
        } catch (Exception e) {
            log.error("[WebPush] Failed to initialise: {}", e.getMessage());
            pushService = null;
        }
    }

    public boolean isConfigured() {
        return StringUtils.hasText(publicKey) && StringUtils.hasText(privateKey);
    }

    public String getPublicKey() {
        return publicKey;
    }

    /**
     * Send a push to every device the user has subscribed. Runs asynchronously so
     * it never delays real-time (WebSocket) message delivery. Dead subscriptions
     * (404/410) are pruned. Best-effort — never throws to callers.
     */
    public void sendToUser(String username, String title, String body, String conversationId, String roomId) {
        if (pushService == null) return;
        CompletableFuture.runAsync(() -> deliver(username, title, body, conversationId, roomId));
    }

    private void deliver(String username, String title, String body, String conversationId, String roomId) {
        List<PushSubscription> subs = subscriptionRepository.findByUsername(username);
        if (subs.isEmpty()) return;

        byte[] payload = buildPayload(title, body, conversationId, roomId);
        for (PushSubscription sub : subs) {
            try {
                Notification notification = new Notification(sub.getEndpoint(), sub.getP256dh(), sub.getAuth(), payload);
                HttpResponse response = pushService.send(notification);
                int status = response.getStatusLine().getStatusCode();
                if (status == 404 || status == 410) {
                    subscriptionRepository.deleteByEndpoint(sub.getEndpoint());
                }
            } catch (Exception e) {
                log.warn("[WebPush] send failed for {} ({}): {}", username, sub.getEndpoint(), e.getMessage());
            }
        }
    }

    private byte[] buildPayload(String title, String body, String conversationId, String roomId) {
        Map<String, Object> data = new HashMap<>();
        data.put("title", title);
        data.put("body", body);
        if (conversationId != null) data.put("conversationId", conversationId);
        if (roomId != null) data.put("roomId", roomId);
        try {
            return objectMapper.writeValueAsBytes(data);
        } catch (Exception e) {
            return ("{\"title\":\"" + title + "\"}").getBytes(StandardCharsets.UTF_8);
        }
    }
}
