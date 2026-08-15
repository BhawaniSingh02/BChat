package com.substring.chat.config;

import com.substring.chat.dto.response.PresenceEvent;
import com.substring.chat.repositories.UserRepository;
import com.substring.chat.services.CallService;
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
import java.time.Instant;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {

    private final PresenceService presenceService;
    private final CallService callService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    @EventListener
    public void handleConnect(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = accessor.getUser();
        if (principal == null) return;

        String username = principal.getName();
        String sessionId = accessor.getSessionId();
        // A user can have several simultaneous sessions (web tab + mobile, or an old
        // connection racing a reconnect) — only broadcast/flip state on their *first*
        // active session, otherwise a second session connecting would be a no-op that's
        // already reflected as online.
        boolean justCameOnline = presenceService.registerSession(username, sessionId);
        log.debug("User connected: {} (session {}, firstSession={})", username, sessionId, justCameOnline);

        if (justCameOnline) {
            boolean broadcastable = userRepository.findByUsername(username)
                    .map(u -> !"NOBODY".equals(u.getOnlinePrivacy()))
                    .orElse(true);
            if (broadcastable) {
                messagingTemplate.convertAndSend("/topic/presence",
                        new PresenceEvent(username, true));
            }
        }
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = accessor.getUser();
        if (principal == null) return;

        String username = principal.getName();
        String sessionId = accessor.getSessionId();
        // Only treat this as the user actually going offline once their *last* session
        // disconnects — closing one of several simultaneous connections (e.g. an idle
        // browser tab) must not mark them offline while another session is still live,
        // and must not tear down a call that's actually happening on that other session.
        boolean justWentOffline = presenceService.unregisterSession(username, sessionId);
        log.debug("User disconnected: {} (session {}, lastSession={})", username, sessionId, justWentOffline);

        if (justWentOffline) {
            callService.expireSessionsForDisconnectedUser(username);

            boolean broadcastable = userRepository.findByUsername(username).map(user -> {
                user.setLastSeen(Instant.now());
                userRepository.save(user);
                return !"NOBODY".equals(user.getOnlinePrivacy());
            }).orElse(true);

            if (broadcastable) {
                messagingTemplate.convertAndSend("/topic/presence",
                        new PresenceEvent(username, false));
            }
        }
    }
}
