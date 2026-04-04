package com.substring.chat.controllers;

import com.substring.chat.dto.response.MessageResponse;
import com.substring.chat.entities.DirectConversation;
import com.substring.chat.entities.Room;
import com.substring.chat.repositories.DirectConversationRepository;
import com.substring.chat.repositories.MessageRepository;
import com.substring.chat.repositories.RoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;

/**
 * Phase 25 — Global message search.
 * GET /api/v1/search/messages?q=...&limit=20
 * Returns messages from all rooms and DMs the authenticated user has access to.
 */
@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
@Slf4j
public class SearchController {

    private static final int MAX_RESULTS = 50;

    private final MessageRepository messageRepository;
    private final RoomRepository roomRepository;
    private final DirectConversationRepository conversationRepository;

    @GetMapping("/messages")
    public ResponseEntity<List<MessageResponse>> searchMessages(
            @RequestParam String q,
            @RequestParam(defaultValue = "20") int limit,
            Principal principal) {

        String username = principal.getName();

        if (!StringUtils.hasText(q) || q.trim().length() < 2) {
            return ResponseEntity.ok(List.of());
        }

        int cap = Math.min(limit, MAX_RESULTS);

        // Collect all room IDs the user is a member of
        List<String> accessibleRoomIds = new ArrayList<>();

        List<Room> myRooms = roomRepository.findByMembersContaining(username);
        for (Room room : myRooms) {
            accessibleRoomIds.add(room.getRoomId());
        }

        // Collect DM room IDs (stored as "dm:{conversationId}")
        List<DirectConversation> myConversations = conversationRepository.findByParticipantsContaining(username);
        for (DirectConversation conv : myConversations) {
            accessibleRoomIds.add("dm:" + conv.getId());
        }

        if (accessibleRoomIds.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<MessageResponse> results = messageRepository
                .findByRoomIdInAndContentContainingIgnoreCaseAndDeletedFalseOrderByTimestampDesc(
                        accessibleRoomIds, q.trim(), PageRequest.of(0, cap))
                .stream()
                .map(MessageResponse::from)
                .toList();

        return ResponseEntity.ok(results);
    }
}
