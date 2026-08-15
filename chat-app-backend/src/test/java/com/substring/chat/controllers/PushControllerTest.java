package com.substring.chat.controllers;

import com.substring.chat.dto.request.MobilePushTokenRequest;
import com.substring.chat.dto.request.PushSubscriptionRequest;
import com.substring.chat.entities.MobilePushToken;
import com.substring.chat.entities.PushSubscription;
import com.substring.chat.repositories.MobilePushTokenRepository;
import com.substring.chat.repositories.PushSubscriptionRepository;
import com.substring.chat.services.WebPushService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PushControllerTest {

    private WebPushService webPushService;
    private PushSubscriptionRepository repo;
    private MobilePushTokenRepository mobileTokenRepo;
    private PushController controller;
    private UserDetails alice;

    @BeforeEach
    void setUp() {
        webPushService = mock(WebPushService.class);
        repo = mock(PushSubscriptionRepository.class);
        mobileTokenRepo = mock(MobilePushTokenRepository.class);
        controller = new PushController(webPushService, repo, mobileTokenRepo);
        alice = mock(UserDetails.class);
        when(alice.getUsername()).thenReturn("alice");
    }

    @Test
    void publicKey_returns204WhenDisabled() {
        when(webPushService.isConfigured()).thenReturn(false);
        ResponseEntity<Map<String, String>> res = controller.publicKey();
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    void publicKey_returnsKeyWhenEnabled() {
        when(webPushService.isConfigured()).thenReturn(true);
        when(webPushService.getPublicKey()).thenReturn("PUB");
        ResponseEntity<Map<String, String>> res = controller.publicKey();
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).containsEntry("publicKey", "PUB");
    }

    @Test
    void subscribe_savesNewSubscriptionForUser() {
        when(repo.findByEndpoint("https://push/abc")).thenReturn(Optional.empty());

        PushSubscriptionRequest req = new PushSubscriptionRequest();
        req.setEndpoint("https://push/abc");
        PushSubscriptionRequest.Keys keys = new PushSubscriptionRequest.Keys();
        keys.setP256dh("p256");
        keys.setAuth("authsecret");
        req.setKeys(keys);

        ResponseEntity<Void> res = controller.subscribe(req, alice);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(repo).save(any(PushSubscription.class));
    }

    @Test
    void subscribe_rejectsMissingFields() {
        PushSubscriptionRequest req = new PushSubscriptionRequest(); // no endpoint/keys
        ResponseEntity<Void> res = controller.subscribe(req, alice);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verify(repo, never()).save(any());
    }

    @Test
    void unsubscribe_deletesByEndpoint() {
        PushSubscriptionRequest req = new PushSubscriptionRequest();
        req.setEndpoint("https://push/abc");
        ResponseEntity<Void> res = controller.unsubscribe(req);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(repo).deleteByEndpoint("https://push/abc");
    }

    @Test
    void registerMobileToken_savesNewTokenForUser() {
        when(mobileTokenRepo.findByExpoPushToken("ExponentPushToken[abc]")).thenReturn(Optional.empty());

        MobilePushTokenRequest req = new MobilePushTokenRequest();
        req.setExpoPushToken("ExponentPushToken[abc]");
        req.setPlatform("android");

        ResponseEntity<Void> res = controller.registerMobileToken(req, alice);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(mobileTokenRepo).save(any(MobilePushToken.class));
    }

    @Test
    void registerMobileToken_reusesExistingTokenRecord() {
        MobilePushToken existing = new MobilePushToken();
        existing.setId("existing-id");
        when(mobileTokenRepo.findByExpoPushToken("ExponentPushToken[abc]")).thenReturn(Optional.of(existing));

        MobilePushTokenRequest req = new MobilePushTokenRequest();
        req.setExpoPushToken("ExponentPushToken[abc]");
        req.setPlatform("android");

        controller.registerMobileToken(req, alice);

        assertThat(existing.getUsername()).isEqualTo("alice");
        verify(mobileTokenRepo).save(existing);
    }

    @Test
    void registerMobileToken_rejectsMissingToken() {
        MobilePushTokenRequest req = new MobilePushTokenRequest();
        ResponseEntity<Void> res = controller.registerMobileToken(req, alice);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verify(mobileTokenRepo, never()).save(any());
    }

    @Test
    void unregisterMobileToken_deletesByToken() {
        MobilePushTokenRequest req = new MobilePushTokenRequest();
        req.setExpoPushToken("ExponentPushToken[abc]");
        ResponseEntity<Void> res = controller.unregisterMobileToken(req);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(mobileTokenRepo).deleteByExpoPushToken("ExponentPushToken[abc]");
    }
}
