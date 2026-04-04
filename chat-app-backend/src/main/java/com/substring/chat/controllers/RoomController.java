package com.substring.chat.controllers;

import com.substring.chat.dto.request.CreateRoomRequest;
import com.substring.chat.dto.request.EditMessageRequest;
import com.substring.chat.dto.request.MuteRequest;
import com.substring.chat.dto.request.UpdateRoomRequest;
import com.substring.chat.dto.response.MessageResponse;
import com.substring.chat.dto.response.RoomResponse;
import com.substring.chat.dto.response.UserResponse;
import com.substring.chat.services.ConversationService;
import com.substring.chat.services.RoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;
    private final ConversationService conversationService;

    @PostMapping
    public ResponseEntity<RoomResponse> createRoom(@Valid @RequestBody CreateRoomRequest request,
                                                   @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(roomService.createRoom(request, userDetails.getUsername()));
    }

    @GetMapping
    public ResponseEntity<List<RoomResponse>> getAllRooms() {
        return ResponseEntity.ok(roomService.getAllRooms());
    }

    @GetMapping("/me")
    public ResponseEntity<List<RoomResponse>> getMyRooms(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(roomService.getRoomsForUser(userDetails.getUsername()));
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<RoomResponse> getRoom(@PathVariable String roomId) {
        return ResponseEntity.ok(roomService.getRoom(roomId));
    }

    @PostMapping("/{roomId}/join")
    public ResponseEntity<RoomResponse> joinRoom(@PathVariable String roomId,
                                                  @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(roomService.joinRoom(roomId, userDetails.getUsername()));
    }

    @DeleteMapping("/{roomId}/leave")
    public ResponseEntity<Void> leaveRoom(@PathVariable String roomId,
                                           @AuthenticationPrincipal UserDetails userDetails) {
        roomService.leaveRoom(roomId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{roomId}/messages")
    public ResponseEntity<Page<MessageResponse>> getMessages(@PathVariable String roomId,
                                                              @RequestParam(defaultValue = "0") int page,
                                                              @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(roomService.getMessages(roomId, page, size));
    }

    @GetMapping("/{roomId}/messages/search")
    public ResponseEntity<List<MessageResponse>> searchMessages(@PathVariable String roomId,
                                                                 @RequestParam String q) {
        return ResponseEntity.ok(roomService.searchMessages(roomId, q));
    }

    @PostMapping("/{roomId}/messages/{messageId}/read")
    public ResponseEntity<MessageResponse> markMessageRead(@PathVariable String roomId,
                                                            @PathVariable String messageId,
                                                            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(roomService.markMessageRead(roomId, messageId, userDetails.getUsername()));
    }

    @PutMapping("/{roomId}/messages/{messageId}")
    public ResponseEntity<MessageResponse> editMessage(@PathVariable String roomId,
                                                        @PathVariable String messageId,
                                                        @Valid @RequestBody EditMessageRequest request,
                                                        @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(roomService.editMessage(roomId, messageId, request.getContent(), userDetails.getUsername()));
    }

    @DeleteMapping("/{roomId}/messages/{messageId}")
    public ResponseEntity<MessageResponse> deleteMessage(@PathVariable String roomId,
                                                          @PathVariable String messageId,
                                                          @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(roomService.deleteMessage(roomId, messageId, userDetails.getUsername()));
    }

    @GetMapping("/{roomId}/members")
    public ResponseEntity<List<UserResponse>> getRoomMembers(@PathVariable String roomId) {
        return ResponseEntity.ok(roomService.getRoomMembers(roomId));
    }

    /** Admin: kick a member from the room */
    @DeleteMapping("/{roomId}/members/{username}")
    public ResponseEntity<RoomResponse> kickMember(@PathVariable String roomId,
                                                    @PathVariable String username,
                                                    @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(roomService.kickMember(roomId, username, userDetails.getUsername()));
    }

    /** Admin: update room name and/or description */
    @PatchMapping("/{roomId}")
    public ResponseEntity<RoomResponse> updateRoom(@PathVariable String roomId,
                                                    @Valid @RequestBody UpdateRoomRequest request,
                                                    @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(roomService.updateRoom(roomId, request, userDetails.getUsername()));
    }

    /** Pin a message in a room (max 3) */
    @PostMapping("/{roomId}/pin/{messageId}")
    public ResponseEntity<RoomResponse> pinMessage(@PathVariable String roomId,
                                                    @PathVariable String messageId,
                                                    @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(roomService.pinMessage(roomId, messageId, userDetails.getUsername()));
    }

    /** Unpin a message from a room */
    @DeleteMapping("/{roomId}/pin/{messageId}")
    public ResponseEntity<RoomResponse> unpinMessage(@PathVariable String roomId,
                                                      @PathVariable String messageId,
                                                      @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(roomService.unpinMessage(roomId, messageId, userDetails.getUsername()));
    }

    // ── Phase 20: Room Mute ──────────────────────────────────────────────

    /** Mute this room for the authenticated user. */
    @PostMapping("/{roomId}/mute")
    public ResponseEntity<Map<String, String>> muteRoom(
            @PathVariable String roomId,
            @RequestBody(required = false) MuteRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String duration = request != null ? request.getDuration() : "ALWAYS";
        conversationService.muteRoom(roomId, userDetails.getUsername(), duration);
        return ResponseEntity.ok(Map.of("message", "Room muted"));
    }

    /** Unmute this room for the authenticated user. */
    @DeleteMapping("/{roomId}/mute")
    public ResponseEntity<Map<String, String>> unmuteRoom(
            @PathVariable String roomId,
            @AuthenticationPrincipal UserDetails userDetails) {
        conversationService.unmuteRoom(roomId, userDetails.getUsername());
        return ResponseEntity.ok(Map.of("message", "Room unmuted"));
    }

    // ── Phase 20: Room Archive ───────────────────────────────────────────

    /** Archive this room for the authenticated user. */
    @PostMapping("/{roomId}/archive")
    public ResponseEntity<Map<String, String>> archiveRoom(
            @PathVariable String roomId,
            @AuthenticationPrincipal UserDetails userDetails) {
        conversationService.archiveRoom(roomId, userDetails.getUsername());
        return ResponseEntity.ok(Map.of("message", "Room archived"));
    }

    /** Unarchive this room. */
    @DeleteMapping("/{roomId}/archive")
    public ResponseEntity<Map<String, String>> unarchiveRoom(
            @PathVariable String roomId,
            @AuthenticationPrincipal UserDetails userDetails) {
        conversationService.unarchiveRoom(roomId, userDetails.getUsername());
        return ResponseEntity.ok(Map.of("message", "Room unarchived"));
    }
}
