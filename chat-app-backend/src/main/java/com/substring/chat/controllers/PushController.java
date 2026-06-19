package com.substring.chat.controllers;

import com.substring.chat.dto.request.PushSubscriptionRequest;
import com.substring.chat.entities.PushSubscription;
import com.substring.chat.repositories.PushSubscriptionRepository;
import com.substring.chat.services.WebPushService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/push")
@RequiredArgsConstructor
public class PushController {

    private final WebPushService webPushService;
    private final PushSubscriptionRepository subscriptionRepository;

    /** Public VAPID key the browser needs to subscribe. 204 when push is disabled. */
    @GetMapping("/public-key")
    public ResponseEntity<Map<String, String>> publicKey() {
        if (!webPushService.isConfigured()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(Map.of("publicKey", webPushService.getPublicKey()));
    }

    /** Register (or refresh) a browser push subscription for the current user. */
    @PostMapping("/subscribe")
    public ResponseEntity<Void> subscribe(
            @RequestBody PushSubscriptionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        if (request == null || request.getEndpoint() == null || request.getKeys() == null) {
            return ResponseEntity.badRequest().build();
        }
        PushSubscription sub = subscriptionRepository.findByEndpoint(request.getEndpoint())
                .orElseGet(PushSubscription::new);
        sub.setUsername(userDetails.getUsername());
        sub.setEndpoint(request.getEndpoint());
        sub.setP256dh(request.getKeys().getP256dh());
        sub.setAuth(request.getKeys().getAuth());
        if (sub.getCreatedAt() == null) sub.setCreatedAt(Instant.now());
        subscriptionRepository.save(sub);
        return ResponseEntity.noContent().build();
    }

    /** Remove a push subscription (on logout or when the browser unsubscribes). */
    @DeleteMapping("/subscribe")
    public ResponseEntity<Void> unsubscribe(@RequestBody PushSubscriptionRequest request) {
        if (request != null && request.getEndpoint() != null) {
            subscriptionRepository.deleteByEndpoint(request.getEndpoint());
        }
        return ResponseEntity.noContent().build();
    }
}
