package com.substring.chat.controllers;

import com.substring.chat.dto.request.SendDirectMessageRequest;
import com.substring.chat.dto.response.DirectConversationResponse;
import com.substring.chat.dto.response.MessageResponse;
import com.substring.chat.services.DirectMessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/dm")
@RequiredArgsConstructor
public class DirectMessageController {

    private final DirectMessageService directMessageService;

    @GetMapping
    public ResponseEntity<List<DirectConversationResponse>> getMyConversations(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(directMessageService.getConversationsForUser(userDetails.getUsername()));
    }

    @PostMapping("/{otherUsername}")
    public ResponseEntity<DirectConversationResponse> getOrCreateConversation(
            @PathVariable String otherUsername,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                directMessageService.getOrCreateConversation(userDetails.getUsername(), otherUsername));
    }

    @GetMapping("/{conversationId}/messages")
    public ResponseEntity<Page<MessageResponse>> getMessages(
            @PathVariable String conversationId,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(
                directMessageService.getMessages(conversationId, userDetails.getUsername(), page, size));
    }

    @PostMapping("/{conversationId}/messages")
    public ResponseEntity<MessageResponse> sendMessage(
            @PathVariable String conversationId,
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SendDirectMessageRequest request) {
        return ResponseEntity.ok(
                directMessageService.sendMessage(conversationId, userDetails.getUsername(), request));
    }
}
