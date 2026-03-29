package com.substring.chat.services;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory presence service. Used by default when no other PresenceService bean is registered.
 * For production multi-instance deployments, use RedisPresenceService instead.
 */
@Service
@ConditionalOnMissingBean(name = "redisPresenceService")
public class InMemoryPresenceService implements PresenceService {

    private final Set<String> onlineUsers = ConcurrentHashMap.newKeySet();

    @Override
    public void setOnline(String username) {
        onlineUsers.add(username);
    }

    @Override
    public void setOffline(String username) {
        onlineUsers.remove(username);
    }

    @Override
    public boolean isOnline(String username) {
        return onlineUsers.contains(username);
    }

    @Override
    public Set<String> getOnlineUsers() {
        return Collections.unmodifiableSet(onlineUsers);
    }

    @Override
    public int getOnlineCount() {
        return onlineUsers.size();
    }
}
