package com.substring.chat.services;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Set;

/**
 * Redis-backed presence service for multi-instance deployments.
 * Activated by setting app.presence.backend=redis in application properties.
 */
@Service("redisPresenceService")
@ConditionalOnProperty(name = "app.presence.backend", havingValue = "redis")
@RequiredArgsConstructor
public class RedisPresenceService implements PresenceService {

    private static final String ONLINE_USERS_KEY = "presence:online";
    private static final String SESSIONS_KEY_PREFIX = "presence:sessions:";

    private final StringRedisTemplate redisTemplate;

    private static String sessionsKey(String username) {
        return SESSIONS_KEY_PREFIX + username;
    }

    @Override
    public boolean registerSession(String username, String sessionId) {
        redisTemplate.opsForSet().add(sessionsKey(username), sessionId);
        Long count = redisTemplate.opsForSet().size(sessionsKey(username));
        boolean wasOffline = count != null && count == 1;
        if (wasOffline) {
            redisTemplate.opsForSet().add(ONLINE_USERS_KEY, username);
        }
        return wasOffline;
    }

    @Override
    public boolean unregisterSession(String username, String sessionId) {
        redisTemplate.opsForSet().remove(sessionsKey(username), sessionId);
        Long remaining = redisTemplate.opsForSet().size(sessionsKey(username));
        boolean nowOffline = remaining == null || remaining == 0;
        if (nowOffline) {
            redisTemplate.opsForSet().remove(ONLINE_USERS_KEY, username);
            redisTemplate.delete(sessionsKey(username));
        }
        return nowOffline;
    }

    @Override
    public boolean isOnline(String username) {
        return Boolean.TRUE.equals(redisTemplate.opsForSet().isMember(ONLINE_USERS_KEY, username));
    }

    @Override
    public Set<String> getOnlineUsers() {
        Set<String> members = redisTemplate.opsForSet().members(ONLINE_USERS_KEY);
        return members != null ? members : Set.of();
    }

    @Override
    public int getOnlineCount() {
        Long size = redisTemplate.opsForSet().size(ONLINE_USERS_KEY);
        return size != null ? size.intValue() : 0;
    }
}
