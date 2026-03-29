package com.substring.chat.services;

import com.substring.chat.dto.request.CreateRoomRequest;
import com.substring.chat.dto.request.UpdateRoomRequest;
import com.substring.chat.dto.response.MessageResponse;
import com.substring.chat.dto.response.RoomResponse;
import com.substring.chat.dto.response.UserResponse;
import com.substring.chat.entities.Message;
import com.substring.chat.entities.Room;
import com.substring.chat.entities.User;
import com.substring.chat.exceptions.MessageNotFoundException;
import com.substring.chat.exceptions.RoomAlreadyExistsException;
import com.substring.chat.exceptions.RoomNotFoundException;
import com.substring.chat.repositories.MessageRepository;
import com.substring.chat.repositories.RoomRepository;
import com.substring.chat.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoomServiceTest {

    @Mock
    private RoomRepository roomRepository;
    @Mock
    private MessageRepository messageRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private RoomService roomService;

    private CreateRoomRequest createRequest;
    private Room existingRoom;

    @BeforeEach
    void setUp() {
        createRequest = new CreateRoomRequest();
        createRequest.setRoomId("general");
        createRequest.setName("General");
        createRequest.setDescription("General discussion");

        existingRoom = new Room();
        existingRoom.setId("room-id-1");
        existingRoom.setRoomId("general");
        existingRoom.setName("General");
        existingRoom.setDescription("General discussion");
        existingRoom.setCreatedBy("alice");
        existingRoom.setMembers(new ArrayList<>());
        existingRoom.getMembers().add("alice");
        existingRoom.setCreatedAt(LocalDateTime.now());
    }

    @Test
    void createRoom_successfullyCreatesNewRoom() {
        when(roomRepository.findByRoomId("general")).thenReturn(null);
        when(roomRepository.save(any(Room.class))).thenReturn(existingRoom);

        RoomResponse response = roomService.createRoom(createRequest, "alice");

        assertThat(response.getRoomId()).isEqualTo("general");
        assertThat(response.getName()).isEqualTo("General");
        assertThat(response.getCreatedBy()).isEqualTo("alice");
        assertThat(response.getMembers()).contains("alice");
    }

    @Test
    void createRoom_throwsWhenRoomIdAlreadyExists() {
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);

        assertThatThrownBy(() -> roomService.createRoom(createRequest, "alice"))
                .isInstanceOf(RoomAlreadyExistsException.class)
                .hasMessageContaining("general");
    }

    @Test
    void getRoom_returnsRoomWhenFound() {
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);

        RoomResponse response = roomService.getRoom("general");

        assertThat(response.getRoomId()).isEqualTo("general");
        assertThat(response.getMemberCount()).isEqualTo(1);
    }

    @Test
    void getRoom_throwsWhenNotFound() {
        when(roomRepository.findByRoomId("nonexistent")).thenReturn(null);

        assertThatThrownBy(() -> roomService.getRoom("nonexistent"))
                .isInstanceOf(RoomNotFoundException.class)
                .hasMessageContaining("nonexistent");
    }

    @Test
    void joinRoom_addsUserToRoom() {
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);
        when(roomRepository.save(any(Room.class))).thenReturn(existingRoom);

        RoomResponse response = roomService.joinRoom("general", "bob");

        assertThat(existingRoom.getMembers()).contains("bob");
    }

    @Test
    void joinRoom_doesNotDuplicateExistingMember() {
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);

        roomService.joinRoom("general", "alice"); // alice is already a member — save should NOT be called

        assertThat(existingRoom.getMembers()).containsOnlyOnce("alice");
    }

    @Test
    void leaveRoom_removesUserFromRoom() {
        existingRoom.getMembers().add("bob");
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);
        when(roomRepository.save(any(Room.class))).thenReturn(existingRoom);

        roomService.leaveRoom("general", "bob");

        assertThat(existingRoom.getMembers()).doesNotContain("bob");
    }

    @Test
    void leaveRoom_throwsWhenRoomNotFound() {
        when(roomRepository.findByRoomId("nonexistent")).thenReturn(null);

        assertThatThrownBy(() -> roomService.leaveRoom("nonexistent", "alice"))
                .isInstanceOf(RoomNotFoundException.class);
    }

    @Test
    void getAllRooms_returnsAllRoomsOrderedByLastMessage() {
        when(roomRepository.findAllByOrderByLastMessageAtDesc()).thenReturn(List.of(existingRoom));

        List<RoomResponse> rooms = roomService.getAllRooms();

        assertThat(rooms).hasSize(1);
        assertThat(rooms.get(0).getRoomId()).isEqualTo("general");
    }

    @Test
    void getRoomsForUser_returnsRoomsContainingUser() {
        when(roomRepository.findByMembersContaining("alice")).thenReturn(List.of(existingRoom));

        List<RoomResponse> rooms = roomService.getRoomsForUser("alice");

        assertThat(rooms).hasSize(1);
        assertThat(rooms.get(0).getMembers()).contains("alice");
    }

    @Test
    void searchMessages_returnsMatchingMessages() {
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);

        Message msg = new Message();
        msg.setId("msg-1");
        msg.setRoomId("general");
        msg.setSender("alice");
        msg.setContent("Hello World");
        msg.setMessageType(Message.MessageType.TEXT);
        msg.setTimestamp(LocalDateTime.now());
        msg.setReadBy(new ArrayList<>());
        when(messageRepository.findByRoomIdAndContentContainingIgnoreCaseOrderByTimestampDesc("general", "hello"))
                .thenReturn(List.of(msg));

        List<MessageResponse> results = roomService.searchMessages("general", "hello");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getContent()).isEqualTo("Hello World");
    }

    @Test
    void searchMessages_throwsWhenRoomNotFound() {
        when(roomRepository.findByRoomId("nonexistent")).thenReturn(null);

        assertThatThrownBy(() -> roomService.searchMessages("nonexistent", "query"))
                .isInstanceOf(RoomNotFoundException.class);
    }

    @Test
    void markMessageRead_addsUsernameToReadBy() {
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);

        Message msg = new Message();
        msg.setId("msg-1");
        msg.setRoomId("general");
        msg.setSender("alice");
        msg.setContent("Hello");
        msg.setMessageType(Message.MessageType.TEXT);
        msg.setTimestamp(LocalDateTime.now());
        msg.setReadBy(new ArrayList<>());
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(msg));
        when(messageRepository.save(any(Message.class))).thenReturn(msg);

        MessageResponse response = roomService.markMessageRead("general", "msg-1", "bob");

        assertThat(msg.getReadBy()).contains("bob");
    }

    @Test
    void editMessage_updatesContentAndSetsEditedFlag() {
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);

        Message msg = new Message();
        msg.setId("msg-1");
        msg.setRoomId("general");
        msg.setSender("alice");
        msg.setContent("Original content");
        msg.setMessageType(Message.MessageType.TEXT);
        msg.setTimestamp(LocalDateTime.now());
        msg.setReadBy(new ArrayList<>());
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(msg));
        when(messageRepository.save(any(Message.class))).thenReturn(msg);

        MessageResponse response = roomService.editMessage("general", "msg-1", "New content", "alice");

        assertThat(msg.getContent()).isEqualTo("New content");
        assertThat(msg.isEdited()).isTrue();
        assertThat(msg.getEditedAt()).isNotNull();
    }

    @Test
    void editMessage_throwsAccessDeniedWhenNotOwner() {
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);

        Message msg = new Message();
        msg.setId("msg-1");
        msg.setSender("alice");
        msg.setRoomId("general");
        msg.setContent("Content");
        msg.setMessageType(Message.MessageType.TEXT);
        msg.setTimestamp(LocalDateTime.now());
        msg.setReadBy(new ArrayList<>());
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(msg));

        assertThatThrownBy(() -> roomService.editMessage("general", "msg-1", "New content", "bob"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    }

    @Test
    void editMessage_throwsMessageNotFoundWhenMissing() {
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);
        when(messageRepository.findById("missing-id")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> roomService.editMessage("general", "missing-id", "content", "alice"))
                .isInstanceOf(MessageNotFoundException.class);
    }

    @Test
    void deleteMessage_softDeletesSetsDeletedAndUpdatesContent() {
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);

        Message msg = new Message();
        msg.setId("msg-1");
        msg.setRoomId("general");
        msg.setSender("alice");
        msg.setContent("Hello");
        msg.setMessageType(Message.MessageType.TEXT);
        msg.setTimestamp(LocalDateTime.now());
        msg.setReadBy(new ArrayList<>());
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(msg));
        when(messageRepository.save(any(Message.class))).thenReturn(msg);

        MessageResponse response = roomService.deleteMessage("general", "msg-1", "alice");

        assertThat(msg.isDeleted()).isTrue();
        assertThat(msg.getContent()).isEqualTo("[This message was deleted]");
    }

    @Test
    void deleteMessage_throwsAccessDeniedWhenNotOwner() {
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);

        Message msg = new Message();
        msg.setId("msg-1");
        msg.setSender("alice");
        msg.setRoomId("general");
        msg.setContent("Content");
        msg.setMessageType(Message.MessageType.TEXT);
        msg.setTimestamp(LocalDateTime.now());
        msg.setReadBy(new ArrayList<>());
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(msg));

        assertThatThrownBy(() -> roomService.deleteMessage("general", "msg-1", "bob"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    }

    @Test
    void markMessageRead_doesNotDuplicateReadBy() {
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);

        Message msg = new Message();
        msg.setId("msg-1");
        msg.setRoomId("general");
        msg.setReadBy(new ArrayList<>(List.of("bob")));
        msg.setTimestamp(LocalDateTime.now());
        msg.setMessageType(Message.MessageType.TEXT);
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(msg));

        roomService.markMessageRead("general", "msg-1", "bob");

        assertThat(msg.getReadBy()).containsOnlyOnce("bob");
    }

    @Test
    void getRoomMembers_returnsAllMembers() {
        existingRoom.getMembers().add("bob");

        User alice = new User();
        alice.setId("u1");
        alice.setUsername("alice");
        alice.setEmail("alice@test.com");
        alice.setCreatedAt(LocalDateTime.now());
        alice.setLastSeen(LocalDateTime.now());

        User bob = new User();
        bob.setId("u2");
        bob.setUsername("bob");
        bob.setEmail("bob@test.com");
        bob.setCreatedAt(LocalDateTime.now());
        bob.setLastSeen(LocalDateTime.now());

        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(userRepository.findByUsername("bob")).thenReturn(Optional.of(bob));

        List<UserResponse> result = roomService.getRoomMembers("general");

        assertThat(result).hasSize(2);
        assertThat(result).extracting(UserResponse::getUsername)
                .containsExactlyInAnyOrder("alice", "bob");
    }

    @Test
    void getRoomMembers_throwsWhenRoomNotFound() {
        when(roomRepository.findByRoomId("unknown")).thenReturn(null);

        assertThatThrownBy(() -> roomService.getRoomMembers("unknown"))
                .isInstanceOf(RoomNotFoundException.class);
    }

    // ── kickMember ────────────────────────────────────────────────────────────

    @Test
    void kickMember_removesTargetFromRoom() {
        existingRoom.getMembers().add("bob");
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);
        when(roomRepository.save(any(Room.class))).thenReturn(existingRoom);

        RoomResponse response = roomService.kickMember("general", "bob", "alice");

        assertThat(existingRoom.getMembers()).doesNotContain("bob");
    }

    @Test
    void kickMember_throwsAccessDeniedWhenNotAdmin() {
        existingRoom.getMembers().add("bob");
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);

        assertThatThrownBy(() -> roomService.kickMember("general", "alice", "bob"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    }

    @Test
    void kickMember_throwsWhenAdminTriesToKickSelf() {
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);

        assertThatThrownBy(() -> roomService.kickMember("general", "alice", "alice"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("themselves");
    }

    @Test
    void kickMember_throwsWhenRoomNotFound() {
        when(roomRepository.findByRoomId("nonexistent")).thenReturn(null);

        assertThatThrownBy(() -> roomService.kickMember("nonexistent", "bob", "alice"))
                .isInstanceOf(RoomNotFoundException.class);
    }

    // ── updateRoom ────────────────────────────────────────────────────────────

    @Test
    void updateRoom_updatesNameAndDescription() {
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);
        when(roomRepository.save(any(Room.class))).thenReturn(existingRoom);

        UpdateRoomRequest request = new UpdateRoomRequest();
        request.setName("New Name");
        request.setDescription("New Description");

        RoomResponse response = roomService.updateRoom("general", request, "alice");

        assertThat(existingRoom.getName()).isEqualTo("New Name");
        assertThat(existingRoom.getDescription()).isEqualTo("New Description");
    }

    @Test
    void updateRoom_throwsAccessDeniedWhenNotAdmin() {
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);

        UpdateRoomRequest request = new UpdateRoomRequest();
        request.setName("Hacked");

        assertThatThrownBy(() -> roomService.updateRoom("general", request, "bob"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    }

    @Test
    void updateRoom_clearsDescriptionWhenBlank() {
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);
        when(roomRepository.save(any(Room.class))).thenReturn(existingRoom);

        UpdateRoomRequest request = new UpdateRoomRequest();
        request.setDescription("  ");

        roomService.updateRoom("general", request, "alice");

        assertThat(existingRoom.getDescription()).isNull();
    }

    // ── pinMessage ────────────────────────────────────────────────────────────

    @Test
    void pinMessage_addsToPinnedMessages() {
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);
        when(roomRepository.save(any(Room.class))).thenReturn(existingRoom);

        RoomResponse response = roomService.pinMessage("general", "msg-1", "alice");

        assertThat(existingRoom.getPinnedMessages()).contains("msg-1");
    }

    @Test
    void pinMessage_doesNotDuplicateWhenAlreadyPinned() {
        existingRoom.getPinnedMessages().add("msg-1");
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);

        roomService.pinMessage("general", "msg-1", "alice");

        assertThat(existingRoom.getPinnedMessages()).containsOnlyOnce("msg-1");
    }

    @Test
    void pinMessage_throwsWhenExceedsMaxPins() {
        existingRoom.getPinnedMessages().addAll(List.of("msg-1", "msg-2", "msg-3"));
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);

        assertThatThrownBy(() -> roomService.pinMessage("general", "msg-4", "alice"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Maximum 3");
    }

    @Test
    void pinMessage_throwsWhenNotMember() {
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);

        assertThatThrownBy(() -> roomService.pinMessage("general", "msg-1", "stranger"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    }

    // ── unpinMessage ──────────────────────────────────────────────────────────

    @Test
    void unpinMessage_removesFromPinnedMessages() {
        existingRoom.getPinnedMessages().add("msg-1");
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);
        when(roomRepository.save(any(Room.class))).thenReturn(existingRoom);

        RoomResponse response = roomService.unpinMessage("general", "msg-1", "alice");

        assertThat(existingRoom.getPinnedMessages()).doesNotContain("msg-1");
    }

    @Test
    void unpinMessage_throwsWhenNotMember() {
        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);

        assertThatThrownBy(() -> roomService.unpinMessage("general", "msg-1", "stranger"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    }

    @Test
    void getRoomMembers_handlesUnknownUsername() {
        existingRoom.getMembers().add("ghost");

        User alice = new User();
        alice.setId("u1");
        alice.setUsername("alice");
        alice.setEmail("alice@test.com");
        alice.setCreatedAt(LocalDateTime.now());
        alice.setLastSeen(LocalDateTime.now());

        when(roomRepository.findByRoomId("general")).thenReturn(existingRoom);
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        List<UserResponse> result = roomService.getRoomMembers("general");

        assertThat(result).hasSize(2);
        assertThat(result).extracting(UserResponse::getUsername)
                .contains("alice", "ghost");
    }
}
