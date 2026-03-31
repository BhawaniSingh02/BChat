package com.substring.chat.config;

import com.substring.chat.dto.response.PresenceEvent;
import com.substring.chat.repositories.UserRepository;
import com.substring.chat.services.PresenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {

    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    @EventListener
    public void handleConnect(SessionConnectedEvent event) {
        Principal principal = event.getUser();
        if (principal == null) return;

        String username = principal.getName();
        presenceService.setOnline(username);
        log.debug("User connected: {}", username);

        // Only broadcast if user's onlinePrivacy is not NOBODY
        boolean broadcastable = userRepository.findByUsername(username)
                .map(u -> !"NOBODY".equals(u.getOnlinePrivacy()))
                .orElse(true);
        if (broadcastable) {
            messagingTemplate.convertAndSend("/topic/presence",
                    new PresenceEvent(username, true));
        }
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = accessor.getUser();
        if (principal == null) return;

        String username = principal.getName();
        presenceService.setOffline(username);
        log.debug("User disconnected: {}", username);

        boolean broadcastable = userRepository.findByUsername(username).map(user -> {
            user.setLastSeen(LocalDateTime.now());
            userRepository.save(user);
            return !"NOBODY".equals(user.getOnlinePrivacy());
        }).orElse(true);

        if (broadcastable) {
            messagingTemplate.convertAndSend("/topic/presence",
                    new PresenceEvent(username, false));
        }
    }
}
