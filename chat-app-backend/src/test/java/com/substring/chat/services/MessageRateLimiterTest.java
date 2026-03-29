package com.substring.chat.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MessageRateLimiterTest {

    private MessageRateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        rateLimiter = new MessageRateLimiter();
    }

    @Test
    void isAllowed_returnsTrueForFirstMessage() {
        assertThat(rateLimiter.isAllowed("alice")).isTrue();
    }

    @Test
    void isAllowed_allowsUpToLimit() {
        for (int i = 0; i < 30; i++) {
            assertThat(rateLimiter.isAllowed("alice")).isTrue();
        }
    }

    @Test
    void isAllowed_returnsFalseAfterLimit() {
        for (int i = 0; i < 30; i++) {
            rateLimiter.isAllowed("alice");
        }
        assertThat(rateLimiter.isAllowed("alice")).isFalse();
    }

    @Test
    void isAllowed_tracksDifferentUsersIndependently() {
        for (int i = 0; i < 30; i++) {
            rateLimiter.isAllowed("alice");
        }
        // alice is rate limited, but bob is not
        assertThat(rateLimiter.isAllowed("alice")).isFalse();
        assertThat(rateLimiter.isAllowed("bob")).isTrue();
    }

    @Test
    void getRemainingMessages_returnsFullLimitForNewUser() {
        assertThat(rateLimiter.getRemainingMessages("newuser")).isEqualTo(30);
    }

    @Test
    void getRemainingMessages_decreasesAfterMessages() {
        rateLimiter.isAllowed("alice");
        rateLimiter.isAllowed("alice");
        assertThat(rateLimiter.getRemainingMessages("alice")).isEqualTo(28);
    }

    @Test
    void getRemainingMessages_returnsZeroWhenLimitReached() {
        for (int i = 0; i < 30; i++) {
            rateLimiter.isAllowed("alice");
        }
        assertThat(rateLimiter.getRemainingMessages("alice")).isEqualTo(0);
    }
}
