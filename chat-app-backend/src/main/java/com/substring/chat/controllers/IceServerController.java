package com.substring.chat.controllers;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Serves the WebRTC ICE server list (STUN + TURN) to both the web and mobile
 * clients, so relay servers can be rotated via environment variables without
 * shipping a new app build. Previously both clients hardcoded OpenRelay's free
 * public TURN, which has since been shut down — calls between devices on
 * different networks (e.g. phone on LTE, laptop on WiFi) silently stopped
 * connecting because no working relay path existed.
 *
 * Configure via env vars on the deployment (e.g. Render):
 *   TURN_URLS       comma-separated, e.g. "turn:a.relay.example.com:80,turns:a.relay.example.com:443?transport=tcp"
 *   TURN_USERNAME   TURN credential username
 *   TURN_CREDENTIAL TURN credential password
 *
 * Without them, only Google STUN is returned (fine for same-network testing,
 * insufficient behind symmetric NAT). Auth is required (anyRequest().authenticated()),
 * which keeps the TURN credentials from being scrapeable anonymously.
 */
@RestController
@RequestMapping("/api/v1/webrtc")
public class IceServerController {

    @Value("${app.turn.urls:${TURN_URLS:}}")
    private String turnUrls;

    @Value("${app.turn.username:${TURN_USERNAME:}}")
    private String turnUsername;

    @Value("${app.turn.credential:${TURN_CREDENTIAL:}}")
    private String turnCredential;

    @GetMapping("/ice-servers")
    public ResponseEntity<List<Map<String, Object>>> getIceServers() {
        List<Map<String, Object>> servers = new ArrayList<>();
        servers.add(Map.of("urls", "stun:stun.l.google.com:19302"));
        servers.add(Map.of("urls", "stun:stun1.l.google.com:19302"));

        if (!turnUrls.isBlank() && !turnUsername.isBlank() && !turnCredential.isBlank()) {
            for (String url : turnUrls.split(",")) {
                String trimmed = url.trim();
                if (trimmed.isEmpty()) continue;
                Map<String, Object> server = new LinkedHashMap<>();
                server.put("urls", trimmed);
                server.put("username", turnUsername);
                server.put("credential", turnCredential);
                servers.add(server);
            }
        }
        return ResponseEntity.ok(servers);
    }
}
