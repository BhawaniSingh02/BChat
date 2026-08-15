package com.substring.chat.services;

import java.util.Set;

public interface PresenceService {
    /**
     * Registers one active connection (WebSocket session) for this user.
     * A user can have several simultaneous sessions (e.g. web tab + mobile app,
     * or overlapping reconnects) — only the first one should flip them online.
     * Returns true iff this was their first active session (they just came online).
     */
    boolean registerSession(String username, String sessionId);

    /**
     * Unregisters one connection. Only when a user's *last* remaining session
     * disconnects should they actually go offline.
     * Returns true iff this was their last active session (they just went offline).
     */
    boolean unregisterSession(String username, String sessionId);

    boolean isOnline(String username);
    Set<String> getOnlineUsers();
    int getOnlineCount();
}
