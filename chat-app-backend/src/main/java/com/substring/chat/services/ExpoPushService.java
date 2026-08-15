package com.substring.chat.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.substring.chat.entities.MobilePushToken;
import com.substring.chat.repositories.MobilePushTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Sends background push notifications to mobile devices via Expo's push service
 * (which fans out to FCM/APNs). Sibling to {@link WebPushService} — same
 * {@code sendToUser} shape, called from the same sites, but a separate delivery
 * channel since mobile has no browser service worker.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExpoPushService {

    private static final URI EXPO_PUSH_URI = URI.create("https://exp.host/--/api/v2/push/send");

    private final MobilePushTokenRepository tokenRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /**
     * Send a push to every mobile device the user has registered. Runs
     * asynchronously and is fully best-effort — never throws to callers.
     */
    public void sendToUser(String username, String title, String body, String conversationId, String roomId) {
        CompletableFuture.runAsync(() -> deliver(username, title, body, conversationId, roomId));
    }

    private void deliver(String username, String title, String body, String conversationId, String roomId) {
        List<MobilePushToken> tokens = tokenRepository.findByUsername(username);
        if (tokens.isEmpty()) return;

        for (MobilePushToken token : tokens) {
            try {
                send(token, title, body, conversationId, roomId);
            } catch (Exception e) {
                log.warn("[ExpoPush] send failed for {} ({}): {}", username, token.getExpoPushToken(), e.getMessage());
            }
        }
    }

    private void send(MobilePushToken token, String title, String body, String conversationId, String roomId) throws Exception {
        Map<String, Object> data = new HashMap<>();
        if (conversationId != null) data.put("conversationId", conversationId);
        if (roomId != null) data.put("roomId", roomId);

        Map<String, Object> message = new HashMap<>();
        message.put("to", token.getExpoPushToken());
        message.put("title", title);
        message.put("body", body);
        message.put("data", data);
        message.put("sound", "default");
        // Matches the Android notification channel the app configures on-device,
        // which carries Baaat's signature chime — Expo's `sound` field only
        // applies on iOS, Android sound comes from the channel itself.
        message.put("channelId", "messages");

        String payload = objectMapper.writeValueAsString(message);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(EXPO_PUSH_URI)
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        pruneIfDeadToken(token, response.body());
    }

    private void pruneIfDeadToken(MobilePushToken token, String responseBody) {
        if (responseBody == null) return;
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode data = root.path("data");
            JsonNode item = data.isArray() ? data.path(0) : data;
            String error = item.path("details").path("error").asText("");
            if ("DeviceNotRegistered".equals(error)) {
                tokenRepository.deleteByExpoPushToken(token.getExpoPushToken());
            }
        } catch (Exception ignored) {
            // Malformed/unexpected response shape — nothing to prune, not fatal.
        }
    }
}
