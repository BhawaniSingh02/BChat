package com.substring.chat.controllers;

import com.substring.chat.services.PresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/presence")
@RequiredArgsConstructor
public class PresenceController {

    private final PresenceService presenceService;

    @GetMapping
    public ResponseEntity<Set<String>> getOnlineUsers() {
        return ResponseEntity.ok(presenceService.getOnlineUsers());
    }

    @GetMapping("/{username}")
    public ResponseEntity<Map<String, Object>> getUserPresence(@PathVariable String username) {
        return ResponseEntity.ok(Map.of(
                "username", username,
                "online", presenceService.isOnline(username)
        ));
    }
}
