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

    private final StringRedisTemplate redisTemplate;

    @Override
    public void setOnline(String username) {
        redisTemplate.opsForSet().add(ONLINE_USERS_KEY, username);
    }

    @Override
    public void setOffline(String username) {
        redisTemplate.opsForSet().remove(ONLINE_USERS_KEY, username);
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
