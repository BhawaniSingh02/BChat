package com.substring.chat.controllers;

import com.substring.chat.services.PresenceService;
import com.substring.chat.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/presence")
@RequiredArgsConstructor
public class PresenceController {

    private final PresenceService presenceService;
    private final UserService userService;

    /** Returns online users whose onlinePrivacy allows the viewer to see them. */
    @GetMapping
    public ResponseEntity<Set<String>> getOnlineUsers(Principal principal) {
        String viewer = principal.getName();
        Set<String> visible = presenceService.getOnlineUsers().stream()
                .filter(u -> userService.isOnlineVisibleTo(u, viewer))
                .collect(Collectors.toSet());
        return ResponseEntity.ok(visible);
    }

    /** Returns online status for a specific user, respecting their privacy setting. */
    @GetMapping("/{username}")
    public ResponseEntity<Map<String, Object>> getUserPresence(
            @PathVariable String username, Principal principal) {
        boolean online = presenceService.isOnline(username)
                && userService.isOnlineVisibleTo(username, principal.getName());
        return ResponseEntity.ok(Map.of("username", username, "online", online));
    }
}
