package com.substring.chat.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PresenceServiceTest {

    private PresenceService presenceService;

    @BeforeEach
    void setUp() {
        presenceService = new InMemoryPresenceService();
    }

    @Test
    void setOnline_marksUserAsOnline() {
        presenceService.setOnline("alice");
        assertThat(presenceService.isOnline("alice")).isTrue();
    }

    @Test
    void setOffline_marksUserAsOffline() {
        presenceService.setOnline("alice");
        presenceService.setOffline("alice");
        assertThat(presenceService.isOnline("alice")).isFalse();
    }

    @Test
    void isOnline_returnsFalseForUnknownUser() {
        assertThat(presenceService.isOnline("nobody")).isFalse();
    }

    @Test
    void getOnlineUsers_returnsAllOnlineUsers() {
        presenceService.setOnline("alice");
        presenceService.setOnline("bob");
        assertThat(presenceService.getOnlineUsers()).containsExactlyInAnyOrder("alice", "bob");
    }

    @Test
    void getOnlineUsers_excludesOfflineUsers() {
        presenceService.setOnline("alice");
        presenceService.setOnline("bob");
        presenceService.setOffline("bob");
        assertThat(presenceService.getOnlineUsers()).containsOnly("alice");
    }

    @Test
    void getOnlineCount_returnsCorrectCount() {
        assertThat(presenceService.getOnlineCount()).isEqualTo(0);
        presenceService.setOnline("alice");
        presenceService.setOnline("bob");
        assertThat(presenceService.getOnlineCount()).isEqualTo(2);
    }

    @Test
    void setOnline_isIdempotent() {
        presenceService.setOnline("alice");
        presenceService.setOnline("alice");
        assertThat(presenceService.getOnlineCount()).isEqualTo(1);
    }

    @Test
    void setOffline_doesNotThrowWhenUserNotOnline() {
        presenceService.setOffline("ghost");
        assertThat(presenceService.isOnline("ghost")).isFalse();
    }
}
