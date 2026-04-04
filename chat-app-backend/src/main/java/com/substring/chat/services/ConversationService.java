package com.substring.chat.services;

import com.substring.chat.dto.response.DirectConversationResponse;
import com.substring.chat.entities.DirectConversation;
import com.substring.chat.entities.Message;
import com.substring.chat.entities.Room;
import com.substring.chat.exceptions.ConversationNotFoundException;
import com.substring.chat.exceptions.RoomNotFoundException;
import com.substring.chat.repositories.DirectConversationRepository;
import com.substring.chat.repositories.MessageRepository;
import com.substring.chat.repositories.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ConversationService {

    private static final Set<String> VALID_TIMERS = Set.of("OFF", "24H", "7D", "90D");
    private static final Set<String> VALID_MUTE_DURATIONS = Set.of("8H", "1W", "ALWAYS");

    private final DirectConversationRepository conversationRepository;
    private final RoomRepository roomRepository;
    private final MessageRepository messageRepository;

    // ── Phase 20: DM Mute ───────────────────────────────────────────────

    public DirectConversationResponse muteDMConversation(String conversationId, String username, String duration) {
        DirectConversation conv = getConversationForUser(conversationId, username);

        Instant muteUntil = computeMuteUntil(duration);
        conv.getMutedBy().put(username, muteUntil);
        return DirectConversationResponse.from(conversationRepository.save(conv));
    }

    public DirectConversationResponse unmuteDMConversation(String conversationId, String username) {
        DirectConversation conv = getConversationForUser(conversationId, username);
        conv.getMutedBy().remove(username);
        return DirectConversationResponse.from(conversationRepository.save(conv));
    }

    // ── Phase 20: DM Archive ─────────────────────────────────────────────

    public DirectConversationResponse archiveDMConversation(String conversationId, String username) {
        DirectConversation conv = getConversationForUser(conversationId, username);
        if (!conv.getArchivedBy().contains(username)) {
            conv.getArchivedBy().add(username);
        }
        return DirectConversationResponse.from(conversationRepository.save(conv));
    }

    public DirectConversationResponse unarchiveDMConversation(String conversationId, String username) {
        DirectConversation conv = getConversationForUser(conversationId, username);
        conv.getArchivedBy().remove(username);
        return DirectConversationResponse.from(conversationRepository.save(conv));
    }

    // ── Phase 21: Disappearing messages timer ───────────────────────────

    public DirectConversationResponse setDisappearingTimer(String conversationId, String username, String timer) {
        if (!VALID_TIMERS.contains(timer)) {
            throw new IllegalArgumentException("Invalid timer value: " + timer + ". Must be one of: OFF, 24H, 7D, 90D");
        }
        DirectConversation conv = getConversationForUser(conversationId, username);
        conv.setDisappearingMessagesTimer(timer);
        DirectConversation saved = conversationRepository.save(conv);

        // If timer was set (not OFF), apply disappearsAt to new messages going forward.
        // Existing messages are NOT retroactively affected.
        return DirectConversationResponse.from(saved);
    }

    // ── Phase 20: Room Mute ──────────────────────────────────────────────

    public void muteRoom(String roomId, String username, String duration) {
        Room room = getRoomForMember(roomId, username);
        Instant muteUntil = computeMuteUntil(duration);
        room.getMutedBy().put(username, muteUntil);
        roomRepository.save(room);
    }

    public void unmuteRoom(String roomId, String username) {
        Room room = getRoomForMember(roomId, username);
        room.getMutedBy().remove(username);
        roomRepository.save(room);
    }

    // ── Phase 20: Room Archive ───────────────────────────────────────────

    public void archiveRoom(String roomId, String username) {
        Room room = getRoomForMember(roomId, username);
        if (!room.getArchivedBy().contains(username)) {
            room.getArchivedBy().add(username);
        }
        roomRepository.save(room);
    }

    public void unarchiveRoom(String roomId, String username) {
        Room room = getRoomForMember(roomId, username);
        room.getArchivedBy().remove(username);
        roomRepository.save(room);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private DirectConversation getConversationForUser(String conversationId, String username) {
        DirectConversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ConversationNotFoundException(conversationId));
        if (!conv.getParticipants().contains(username)) {
            throw new ConversationNotFoundException(conversationId);
        }
        return conv;
    }

    private Room getRoomForMember(String roomId, String username) {
        Room room = roomRepository.findByRoomId(roomId);
        if (room == null || !room.getMembers().contains(username)) {
            throw new RoomNotFoundException(roomId);
        }
        return room;
    }

    /**
     * Compute the Instant until which a user is muted.
     * "ALWAYS" → very far future (effectively permanent until unmuted).
     */
    private Instant computeMuteUntil(String duration) {
        if (duration == null || "ALWAYS".equals(duration)) {
            return Instant.parse("9999-12-31T23:59:59Z");
        }
        return switch (duration) {
            case "8H" -> Instant.now().plusSeconds(8 * 3600);
            case "1W" -> Instant.now().plusSeconds(7 * 24 * 3600);
            default -> Instant.parse("9999-12-31T23:59:59Z");
        };
    }
}
