package com.substring.chat.services;

import com.substring.chat.dto.response.DirectConversationResponse;
import com.substring.chat.entities.DirectConversation;
import com.substring.chat.entities.Room;
import com.substring.chat.exceptions.ConversationNotFoundException;
import com.substring.chat.exceptions.RoomNotFoundException;
import com.substring.chat.repositories.DirectConversationRepository;
import com.substring.chat.repositories.MessageRepository;
import com.substring.chat.repositories.RoomRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConversationServiceTest {

    @Mock private DirectConversationRepository conversationRepository;
    @Mock private RoomRepository roomRepository;
    @Mock private MessageRepository messageRepository;

    @InjectMocks private ConversationService conversationService;

    private DirectConversation testConversation;
    private Room testRoom;

    @BeforeEach
    void setUp() {
        testConversation = new DirectConversation();
        testConversation.setId("conv-1");
        testConversation.setParticipants(new ArrayList<>(List.of("alice", "bob")));
        testConversation.setMutedBy(new HashMap<>());
        testConversation.setArchivedBy(new ArrayList<>());
        testConversation.setDisappearingMessagesTimer("OFF");

        testRoom = new Room();
        testRoom.setId("room-id");
        testRoom.setRoomId("test-room");
        testRoom.setMembers(new ArrayList<>(List.of("alice", "bob")));
        testRoom.setMutedBy(new HashMap<>());
        testRoom.setArchivedBy(new ArrayList<>());
    }

    // ── Phase 20: DM Mute ───────────────────────────────────────────────

    @Test
    void muteDMConversation_setsMuteForUser() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(testConversation));
        when(conversationRepository.save(any(DirectConversation.class))).thenAnswer(inv -> inv.getArgument(0));

        DirectConversationResponse response = conversationService.muteDMConversation("conv-1", "alice", "8H");

        assertThat(response.getMutedBy()).containsKey("alice");
        Instant muteUntil = response.getMutedBy().get("alice");
        assertThat(muteUntil).isAfter(Instant.now());
    }

    @Test
    void muteDMConversation_alwaysDuration_setsFarFutureDate() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(testConversation));
        when(conversationRepository.save(any(DirectConversation.class))).thenAnswer(inv -> inv.getArgument(0));

        DirectConversationResponse response = conversationService.muteDMConversation("conv-1", "alice", "ALWAYS");

        Instant muteUntil = response.getMutedBy().get("alice");
        assertThat(muteUntil).isAfter(Instant.now().plusSeconds(365L * 24 * 3600));
    }

    @Test
    void muteDMConversation_throwsWhenUserNotParticipant() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(testConversation));

        assertThatThrownBy(() -> conversationService.muteDMConversation("conv-1", "charlie", "ALWAYS"))
                .isInstanceOf(ConversationNotFoundException.class);
    }

    @Test
    void unmuteDMConversation_removesMuteForUser() {
        testConversation.getMutedBy().put("alice", Instant.parse("9999-12-31T23:59:59Z"));
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(testConversation));
        when(conversationRepository.save(any(DirectConversation.class))).thenAnswer(inv -> inv.getArgument(0));

        DirectConversationResponse response = conversationService.unmuteDMConversation("conv-1", "alice");

        assertThat(response.getMutedBy()).doesNotContainKey("alice");
    }

    // ── Phase 20: DM Archive ─────────────────────────────────────────────

    @Test
    void archiveDMConversation_addsUserToArchivedList() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(testConversation));
        when(conversationRepository.save(any(DirectConversation.class))).thenAnswer(inv -> inv.getArgument(0));

        DirectConversationResponse response = conversationService.archiveDMConversation("conv-1", "alice");

        assertThat(response.getArchivedBy()).contains("alice");
    }

    @Test
    void archiveDMConversation_idempotent_doesNotDuplicateUser() {
        testConversation.getArchivedBy().add("alice");
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(testConversation));
        when(conversationRepository.save(any(DirectConversation.class))).thenAnswer(inv -> inv.getArgument(0));

        DirectConversationResponse response = conversationService.archiveDMConversation("conv-1", "alice");

        long aliceCount = response.getArchivedBy().stream().filter("alice"::equals).count();
        assertThat(aliceCount).isEqualTo(1);
    }

    @Test
    void unarchiveDMConversation_removesUserFromArchivedList() {
        testConversation.getArchivedBy().add("alice");
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(testConversation));
        when(conversationRepository.save(any(DirectConversation.class))).thenAnswer(inv -> inv.getArgument(0));

        DirectConversationResponse response = conversationService.unarchiveDMConversation("conv-1", "alice");

        assertThat(response.getArchivedBy()).doesNotContain("alice");
    }

    // ── Phase 21: Disappearing messages ─────────────────────────────────

    @Test
    void setDisappearingTimer_setsValidTimer() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(testConversation));
        when(conversationRepository.save(any(DirectConversation.class))).thenAnswer(inv -> inv.getArgument(0));

        DirectConversationResponse response = conversationService.setDisappearingTimer("conv-1", "alice", "7D");

        assertThat(response.getDisappearingMessagesTimer()).isEqualTo("7D");
    }

    @Test
    void setDisappearingTimer_throwsForInvalidTimer() {
        // validation fires before DB call — no stub needed
        assertThatThrownBy(() -> conversationService.setDisappearingTimer("conv-1", "alice", "INVALID"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid timer");
    }

    @Test
    void setDisappearingTimer_turnsOff() {
        testConversation.setDisappearingMessagesTimer("24H");
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(testConversation));
        when(conversationRepository.save(any(DirectConversation.class))).thenAnswer(inv -> inv.getArgument(0));

        DirectConversationResponse response = conversationService.setDisappearingTimer("conv-1", "alice", "OFF");

        assertThat(response.getDisappearingMessagesTimer()).isEqualTo("OFF");
    }

    // ── Phase 20: Room Mute / Archive ────────────────────────────────────

    @Test
    void muteRoom_setsMuteForUser() {
        when(roomRepository.findByRoomId("test-room")).thenReturn(testRoom);
        when(roomRepository.save(any(Room.class))).thenReturn(testRoom);

        conversationService.muteRoom("test-room", "alice", "1W");

        assertThat(testRoom.getMutedBy()).containsKey("alice");
    }

    @Test
    void unmuteRoom_removesMuteForUser() {
        testRoom.getMutedBy().put("alice", Instant.parse("9999-12-31T23:59:59Z"));
        when(roomRepository.findByRoomId("test-room")).thenReturn(testRoom);
        when(roomRepository.save(any(Room.class))).thenReturn(testRoom);

        conversationService.unmuteRoom("test-room", "alice");

        assertThat(testRoom.getMutedBy()).doesNotContainKey("alice");
    }

    @Test
    void archiveRoom_addsUserToArchivedList() {
        when(roomRepository.findByRoomId("test-room")).thenReturn(testRoom);
        when(roomRepository.save(any(Room.class))).thenReturn(testRoom);

        conversationService.archiveRoom("test-room", "alice");

        assertThat(testRoom.getArchivedBy()).contains("alice");
    }

    @Test
    void unarchiveRoom_removesUserFromArchivedList() {
        testRoom.getArchivedBy().add("alice");
        when(roomRepository.findByRoomId("test-room")).thenReturn(testRoom);
        when(roomRepository.save(any(Room.class))).thenReturn(testRoom);

        conversationService.unarchiveRoom("test-room", "alice");

        assertThat(testRoom.getArchivedBy()).doesNotContain("alice");
    }

    @Test
    void muteRoom_throwsWhenUserNotMember() {
        when(roomRepository.findByRoomId("test-room")).thenReturn(testRoom);

        assertThatThrownBy(() -> conversationService.muteRoom("test-room", "charlie", "ALWAYS"))
                .isInstanceOf(RoomNotFoundException.class);
    }

    @Test
    void muteRoom_throwsWhenRoomNotFound() {
        when(roomRepository.findByRoomId("bad-room")).thenReturn(null);

        assertThatThrownBy(() -> conversationService.muteRoom("bad-room", "alice", "ALWAYS"))
                .isInstanceOf(RoomNotFoundException.class);
    }
}
