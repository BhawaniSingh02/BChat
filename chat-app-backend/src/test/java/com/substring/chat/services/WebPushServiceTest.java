package com.substring.chat.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.substring.chat.repositories.PushSubscriptionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class WebPushServiceTest {

    private final PushSubscriptionRepository repo = mock(PushSubscriptionRepository.class);
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void notConfiguredByDefault_andSendIsNoOp() {
        WebPushService service = new WebPushService(repo, mapper);
        service.init(); // no VAPID keys

        assertThat(service.isConfigured()).isFalse();

        // With push disabled, sending must not even query subscriptions.
        service.sendToUser("alice", "Title", "Body", "conv-1", null);
        verifyNoInteractions(repo);
    }

    @Test
    void reportsConfiguredWhenKeysPresent() {
        WebPushService service = new WebPushService(repo, mapper);
        ReflectionTestUtils.setField(service, "publicKey", "test-public-key");
        ReflectionTestUtils.setField(service, "privateKey", "test-private-key");

        assertThat(service.isConfigured()).isTrue();
        assertThat(service.getPublicKey()).isEqualTo("test-public-key");
    }
}
