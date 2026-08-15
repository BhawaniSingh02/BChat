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
    void registerSession_marksUserAsOnline() {
        presenceService.registerSession("alice", "session-1");
        assertThat(presenceService.isOnline("alice")).isTrue();
    }

    @Test
    void registerSession_firstSessionReturnsTrue() {
        assertThat(presenceService.registerSession("alice", "session-1")).isTrue();
    }

    @Test
    void registerSession_secondSessionForSameUserReturnsFalse() {
        presenceService.registerSession("alice", "session-1");
        assertThat(presenceService.registerSession("alice", "session-2")).isFalse();
    }

    @Test
    void unregisterSession_lastSessionMarksUserOfflineAndReturnsTrue() {
        presenceService.registerSession("alice", "session-1");
        assertThat(presenceService.unregisterSession("alice", "session-1")).isTrue();
        assertThat(presenceService.isOnline("alice")).isFalse();
    }

    @Test
    void unregisterSession_oneOfSeveralSessionsKeepsUserOnline() {
        // Regression test for the bug this fix addresses: a user with two simultaneous
        // connections (e.g. a web tab and the mobile app) must stay online when only one
        // of them disconnects.
        presenceService.registerSession("alice", "session-1");
        presenceService.registerSession("alice", "session-2");
        assertThat(presenceService.unregisterSession("alice", "session-1")).isFalse();
        assertThat(presenceService.isOnline("alice")).isTrue();
    }

    @Test
    void isOnline_returnsFalseForUnknownUser() {
        assertThat(presenceService.isOnline("nobody")).isFalse();
    }

    @Test
    void getOnlineUsers_returnsAllOnlineUsers() {
        presenceService.registerSession("alice", "session-1");
        presenceService.registerSession("bob", "session-1");
        assertThat(presenceService.getOnlineUsers()).containsExactlyInAnyOrder("alice", "bob");
    }

    @Test
    void getOnlineUsers_excludesOfflineUsers() {
        presenceService.registerSession("alice", "session-1");
        presenceService.registerSession("bob", "session-1");
        presenceService.unregisterSession("bob", "session-1");
        assertThat(presenceService.getOnlineUsers()).containsOnly("alice");
    }

    @Test
    void getOnlineCount_returnsCorrectCount() {
        assertThat(presenceService.getOnlineCount()).isEqualTo(0);
        presenceService.registerSession("alice", "session-1");
        presenceService.registerSession("bob", "session-1");
        assertThat(presenceService.getOnlineCount()).isEqualTo(2);
    }

    @Test
    void registerSession_sameSessionTwiceIsIdempotent() {
        presenceService.registerSession("alice", "session-1");
        presenceService.registerSession("alice", "session-1");
        assertThat(presenceService.getOnlineCount()).isEqualTo(1);
    }

    @Test
    void unregisterSession_doesNotThrowWhenUserNotOnline() {
        assertThat(presenceService.unregisterSession("ghost", "session-1")).isFalse();
        assertThat(presenceService.isOnline("ghost")).isFalse();
    }
}
