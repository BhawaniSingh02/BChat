package com.substring.chat.controllers;

import com.substring.chat.dto.request.SendMessageRequest;
import com.substring.chat.dto.response.MessageResponse;
import com.substring.chat.entities.Message;
import com.substring.chat.entities.Room;
import com.substring.chat.repositories.DirectConversationRepository;
import com.substring.chat.repositories.MessageRepository;
import com.substring.chat.repositories.RoomRepository;
import com.substring.chat.services.MessageRateLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.security.Principal;
import java.time.Instant;
import java.util.List;

/**
 * Phase 27 — Message Threads.
 *
 * REST:  GET  /api/v1/threads/{messageId}      → fetch all replies for a root message
 * STOMP: /app/thread.reply/{messageId}         → send a threaded reply
 *        /topic/thread/{messageId}             → subscribe to thread updates
 */
@Controller
@RequestMapping("/api/v1/threads")
@RequiredArgsConstructor
@Slf4j
public class ThreadController {

    private final MessageRepository messageRepository;
    private final RoomRepository roomRepository;
    private final DirectConversationRepository conversationRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final MessageRateLimiter rateLimiter;

    // ── REST: fetch thread replies ────────────────────────────────────────

    @GetMapping("/{messageId}")
    @ResponseBody
    public ResponseEntity<List<MessageResponse>> getThreadReplies(@PathVariable String messageId) {
        // Return replies sorted oldest-first so the thread renders chronologically
        List<MessageResponse> replies = messageRepository.findByThreadIdOrderByTimestampAsc(messageId)
                .stream()
                .map(MessageResponse::from)
                .toList();
        return ResponseEntity.ok(replies);
    }

    // ── STOMP: send a thread reply ────────────────────────────────────────

    /**
     * Send a reply to a thread. The root message ID is used as the threadId.
     * Broadcasts to /topic/thread/{rootMessageId} so all thread watchers receive it.
     */
    @MessageMapping("/thread.reply/{rootMessageId}")
    public void replyInThread(@DestinationVariable String rootMessageId,
                               @Payload SendMessageRequest request,
                               Principal principal) {
        if (!rateLimiter.isAllowed(principal.getName())) {
            log.warn("Rate limit exceeded for thread reply from user: {}", principal.getName());
            return;
        }

        // Validate root message exists
        Message root = messageRepository.findById(rootMessageId).orElse(null);
        if (root == null || root.isDeleted()) {
            log.warn("Thread reply to missing/deleted message {} from {}", rootMessageId, principal.getName());
            return;
        }

        // Validate the user has access to the room this thread belongs to
        String roomId = root.getRoomId();
        boolean hasAccess = hasRoomAccess(roomId, principal.getName());
        if (!hasAccess) {
            log.warn("User {} attempted thread reply in room {} without access", principal.getName(), roomId);
            return;
        }

        // Build the reply message
        Message reply = new Message();
        reply.setSender(principal.getName());
        reply.setSenderName(request.getSenderName() != null ? request.getSenderName() : principal.getName());
        reply.setRoomId(roomId);
        reply.setContent(request.getContent());
        reply.setMessageType(request.getMessageType() != null
                ? request.getMessageType()
                : Message.MessageType.TEXT);
        reply.setFileUrl(request.getFileUrl());
        reply.setThreadId(rootMessageId);  // link to parent
        reply.setTimestamp(Instant.now());
        messageRepository.save(reply);

        // Update root message reply count + lastThreadReplyAt
        root.setThreadReplyCount(root.getThreadReplyCount() + 1);
        root.setLastThreadReplyAt(reply.getTimestamp());
        messageRepository.save(root);

        // Broadcast new reply to thread subscribers
        MessageResponse replyResponse = MessageResponse.from(reply);
        messagingTemplate.convertAndSend("/topic/thread/" + rootMessageId, replyResponse);

        // Also broadcast updated root message to room so reply count shows live
        MessageResponse rootResponse = MessageResponse.from(root);
        if (roomId.startsWith("dm:")) {
            String conversationId = roomId.substring(3);
            messagingTemplate.convertAndSend("/topic/dm/" + conversationId, rootResponse);
        } else {
            messagingTemplate.convertAndSend("/topic/room/" + roomId, rootResponse);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private boolean hasRoomAccess(String roomId, String username) {
        if (roomId.startsWith("dm:")) {
            String conversationId = roomId.substring(3);
            return conversationRepository.findById(conversationId)
                    .map(c -> c.getParticipants().contains(username))
                    .orElse(false);
        }
        Room room = roomRepository.findByRoomId(roomId);
        return room != null && room.getMembers().contains(username);
    }
}
