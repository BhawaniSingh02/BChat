package com.substring.chat.services;

import java.util.Set;

public interface PresenceService {
    void setOnline(String username);
    void setOffline(String username);
    boolean isOnline(String username);
    Set<String> getOnlineUsers();
    int getOnlineCount();
}
