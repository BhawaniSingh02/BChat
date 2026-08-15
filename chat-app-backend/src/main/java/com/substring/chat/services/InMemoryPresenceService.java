package com.substring.chat.services;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * In-memory presence service. Used by default when no other PresenceService bean is registered.
 * For production multi-instance deployments, use RedisPresenceService instead.
 */
@Service
@ConditionalOnMissingBean(name = "redisPresenceService")
public class InMemoryPresenceService implements PresenceService {

    // username -> set of active session ids. A user is online iff their set is non-empty.
    private final Map<String, Set<String>> sessionsByUser = new ConcurrentHashMap<>();

    @Override
    public boolean registerSession(String username, String sessionId) {
        Set<String> sessions = sessionsByUser.computeIfAbsent(username, k -> ConcurrentHashMap.newKeySet());
        boolean wasOffline = sessions.isEmpty();
        sessions.add(sessionId);
        return wasOffline;
    }

    @Override
    public boolean unregisterSession(String username, String sessionId) {
        Set<String> sessions = sessionsByUser.get(username);
        if (sessions == null) return false;
        sessions.remove(sessionId);
        return sessions.isEmpty();
    }

    @Override
    public boolean isOnline(String username) {
        Set<String> sessions = sessionsByUser.get(username);
        return sessions != null && !sessions.isEmpty();
    }

    @Override
    public Set<String> getOnlineUsers() {
        return sessionsByUser.entrySet().stream()
                .filter(e -> !e.getValue().isEmpty())
                .map(Map.Entry::getKey)
                .collect(Collectors.toUnmodifiableSet());
    }

    @Override
    public int getOnlineCount() {
        return (int) sessionsByUser.values().stream().filter(s -> !s.isEmpty()).count();
    }
}
