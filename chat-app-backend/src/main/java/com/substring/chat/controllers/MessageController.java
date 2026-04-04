package com.substring.chat.controllers;

import com.substring.chat.dto.request.ForwardMessageRequest;
import com.substring.chat.dto.response.MessageResponse;
import com.substring.chat.services.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    // ── Phase 19: Starring ───────────────────────────────────────────────

    /**
     * Toggle star on a message.
     * POST /api/v1/messages/{messageId}/star
     */
    @PostMapping("/{messageId}/star")
    public ResponseEntity<MessageResponse> toggleStar(
            @PathVariable String messageId,
            Principal principal) {
        return ResponseEntity.ok(messageService.toggleStar(messageId, principal.getName()));
    }

    /**
     * Get all starred messages for the authenticated user.
     * GET /api/v1/messages/starred
     */
    @GetMapping("/starred")
    public ResponseEntity<List<MessageResponse>> getStarredMessages(Principal principal) {
        return ResponseEntity.ok(messageService.getStarredMessages(principal.getName()));
    }

    // ── Phase 18: Forward ────────────────────────────────────────────────

    /**
     * Forward a message to a room or DM conversation.
     * POST /api/v1/messages/{messageId}/forward
     * Body: { "roomId": "..." } OR { "conversationId": "..." }
     */
    @PostMapping("/{messageId}/forward")
    public ResponseEntity<MessageResponse> forwardMessage(
            @PathVariable String messageId,
            @RequestBody ForwardMessageRequest request,
            Principal principal) {

        MessageResponse response;
        if (request.getRoomId() != null) {
            response = messageService.forwardToRoom(messageId, request.getRoomId(), principal.getName());
        } else if (request.getConversationId() != null) {
            response = messageService.forwardToDM(messageId, request.getConversationId(), principal.getName());
        } else {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(response);
    }

    // ── Phase 22: Read receipts ──────────────────────────────────────────

    /**
     * Get per-user read receipt timestamps for a message.
     * GET /api/v1/messages/{messageId}/read-receipts
     */
    @GetMapping("/{messageId}/read-receipts")
    public ResponseEntity<Map<String, Instant>> getReadReceipts(
            @PathVariable String messageId,
            Principal principal) {
        return ResponseEntity.ok(messageService.getReadReceipts(messageId, principal.getName()));
    }
}
