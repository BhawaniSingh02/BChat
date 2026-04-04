package com.substring.chat.services;

import com.substring.chat.dto.response.MessageResponse;
import com.substring.chat.entities.DirectConversation;
import com.substring.chat.entities.Message;
import com.substring.chat.entities.Room;
import com.substring.chat.exceptions.MessageNotFoundException;
import com.substring.chat.repositories.DirectConversationRepository;
import com.substring.chat.repositories.MessageRepository;
import com.substring.chat.repositories.RoomRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageServiceTest {

    @Mock private MessageRepository messageRepository;
    @Mock private RoomRepository roomRepository;
    @Mock private DirectConversationRepository conversationRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;

    @InjectMocks private MessageService messageService;

    private Message testMessage;
    private Room testRoom;
    private DirectConversation testConversation;

    @BeforeEach
    void setUp() {
        testMessage = new Message();
        testMessage.setId("msg-1");
        testMessage.setRoomId("room-1");
        testMessage.setSender("alice");
        testMessage.setSenderName("alice");
        testMessage.setContent("Hello World");
        testMessage.setMessageType(Message.MessageType.TEXT);
        testMessage.setTimestamp(Instant.now());
        testMessage.setStarred(new ArrayList<>());
        testMessage.setReadBy(new ArrayList<>());
        testMessage.setReadAt(new HashMap<>());
        testMessage.setReactions(new HashMap<>());

        testRoom = new Room();
        testRoom.setId("room-id");
        testRoom.setRoomId("room-1");
        testRoom.setMembers(new ArrayList<>(List.of("alice", "bob")));
        testRoom.setMutedBy(new HashMap<>());
        testRoom.setArchivedBy(new ArrayList<>());

        testConversation = new DirectConversation();
        testConversation.setId("conv-1");
        testConversation.setParticipants(new ArrayList<>(List.of("alice", "bob")));
        testConversation.setMutedBy(new HashMap<>());
        testConversation.setArchivedBy(new ArrayList<>());
        testConversation.setDisappearingMessagesTimer("OFF");
    }

    // ── Phase 19: Star / Unstar ──────────────────────────────────────────

    @Test
    void toggleStar_addsStarWhenNotStarred() {
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(testMessage));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        MessageResponse response = messageService.toggleStar("msg-1", "bob");

        assertThat(response.getStarred()).contains("bob");
    }

    @Test
    void toggleStar_removesStarWhenAlreadyStarred() {
        testMessage.getStarred().add("bob");
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(testMessage));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        MessageResponse response = messageService.toggleStar("msg-1", "bob");

        assertThat(response.getStarred()).doesNotContain("bob");
    }

    @Test
    void toggleStar_throwsWhenMessageNotFound() {
        when(messageRepository.findById("bad")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> messageService.toggleStar("bad", "bob"))
                .isInstanceOf(MessageNotFoundException.class);
    }

    @Test
    void getStarredMessages_returnsOnlyNonDeletedStarredMessages() {
        Message deleted = new Message();
        deleted.setId("msg-2");
        deleted.setDeleted(true);
        deleted.setStarred(new ArrayList<>(List.of("alice")));
        deleted.setReadBy(new ArrayList<>());
        deleted.setReadAt(new HashMap<>());
        deleted.setReactions(new HashMap<>());

        testMessage.getStarred().add("alice");
        when(messageRepository.findByStarredContaining("alice"))
                .thenReturn(List.of(testMessage, deleted));

        List<MessageResponse> starred = messageService.getStarredMessages("alice");

        assertThat(starred).hasSize(1);
        assertThat(starred.get(0).getId()).isEqualTo("msg-1");
    }

    // ── Phase 18: Forward to Room ────────────────────────────────────────

    @Test
    void forwardToRoom_createsForwardedMessageWithOriginalSender() {
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(testMessage));
        when(roomRepository.findByRoomId("room-1")).thenReturn(testRoom);
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> {
            Message m = inv.getArgument(0);
            m.setId("msg-fwd");
            m.setStarred(new ArrayList<>());
            m.setReadBy(new ArrayList<>());
            m.setReadAt(new HashMap<>());
            m.setReactions(new HashMap<>());
            return m;
        });
        when(roomRepository.save(any(Room.class))).thenReturn(testRoom);

        MessageResponse response = messageService.forwardToRoom("msg-1", "room-1", "bob");

        assertThat(response.getForwardedFrom()).isEqualTo("alice"); // original sender
        assertThat(response.getSender()).isEqualTo("bob");           // forwarded by bob
        verify(messagingTemplate).convertAndSend(eq("/topic/room/room-1"), any(MessageResponse.class));
    }

    @Test
    void forwardToRoom_throwsWhenUserNotMember() {
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(testMessage));
        when(roomRepository.findByRoomId("room-1")).thenReturn(testRoom);

        assertThatThrownBy(() -> messageService.forwardToRoom("msg-1", "room-1", "charlie"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not a member");
    }

    @Test
    void forwardToRoom_throwsWhenRoomNotFound() {
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(testMessage));
        when(roomRepository.findByRoomId("bad-room")).thenReturn(null);

        assertThatThrownBy(() -> messageService.forwardToRoom("msg-1", "bad-room", "alice"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ── Phase 18: Forward to DM ──────────────────────────────────────────

    @Test
    void forwardToDM_createsForwardedMessageAndNotifiesParticipants() {
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(testMessage));
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(testConversation));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> {
            Message m = inv.getArgument(0);
            m.setId("msg-fwd-dm");
            m.setStarred(new ArrayList<>());
            m.setReadBy(new ArrayList<>());
            m.setReadAt(new HashMap<>());
            m.setReactions(new HashMap<>());
            return m;
        });
        when(conversationRepository.save(any(DirectConversation.class))).thenReturn(testConversation);

        MessageResponse response = messageService.forwardToDM("msg-1", "conv-1", "alice");

        assertThat(response.getForwardedFrom()).isEqualTo("alice");
        // Both participants should receive the message
        verify(messagingTemplate).convertAndSendToUser(eq("alice"), anyString(), any(MessageResponse.class));
        verify(messagingTemplate).convertAndSendToUser(eq("bob"), anyString(), any(MessageResponse.class));
    }

    @Test
    void forwardToDM_throwsWhenUserNotParticipant() {
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(testMessage));
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(testConversation));

        assertThatThrownBy(() -> messageService.forwardToDM("msg-1", "conv-1", "charlie"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not a participant");
    }

    @Test
    void forwardMessage_preservesOriginalForwardedFrom_onReFoward() {
        // If alice forwarded a message from charlie, bob re-forwarding should still show charlie
        testMessage.setForwardedFrom("charlie");
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(testMessage));
        when(roomRepository.findByRoomId("room-1")).thenReturn(testRoom);
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> {
            Message m = inv.getArgument(0);
            m.setId("msg-refwd");
            m.setStarred(new ArrayList<>());
            m.setReadBy(new ArrayList<>());
            m.setReadAt(new HashMap<>());
            m.setReactions(new HashMap<>());
            return m;
        });
        when(roomRepository.save(any(Room.class))).thenReturn(testRoom);

        MessageResponse response = messageService.forwardToRoom("msg-1", "room-1", "bob");

        assertThat(response.getForwardedFrom()).isEqualTo("charlie"); // original origin preserved
    }

    // ── Phase 22: Read receipt details ──────────────────────────────────

    @Test
    void markReadWithTimestamp_addsToReadByAndReadAt() {
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(testMessage));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        Message result = messageService.markReadWithTimestamp("msg-1", "bob");

        assertThat(result.getReadBy()).contains("bob");
        assertThat(result.getReadAt()).containsKey("bob");
        assertThat(result.getReadAt().get("bob")).isAfter(Instant.now().minusSeconds(5));
    }

    @Test
    void markReadWithTimestamp_doesNotDuplicateReadBy() {
        testMessage.getReadBy().add("bob");
        testMessage.getReadAt().put("bob", Instant.now().minusSeconds(60));
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(testMessage));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        Message result = messageService.markReadWithTimestamp("msg-1", "bob");

        long bobCount = result.getReadBy().stream().filter("bob"::equals).count();
        assertThat(bobCount).isEqualTo(1); // no duplicates
    }

    @Test
    void getReadReceipts_returnsReadAtMap() {
        testMessage.getReadAt().put("bob", Instant.parse("2026-01-01T12:00:00Z"));
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(testMessage));

        var receipts = messageService.getReadReceipts("msg-1", "alice");

        assertThat(receipts).containsKey("bob");
    }

    // ── Phase 21: Disappearing messages purge ───────────────────────────

    @Test
    void purgeExpiredMessages_softDeletesExpiredMessages() {
        Message expired = new Message();
        expired.setId("exp-1");
        expired.setRoomId("room-1");
        expired.setContent("expires soon");
        expired.setDeleted(false);
        expired.setDisappearsAt(Instant.now().minusSeconds(10));
        expired.setStarred(new ArrayList<>());
        expired.setReadBy(new ArrayList<>());
        expired.setReadAt(new HashMap<>());
        expired.setReactions(new HashMap<>());

        when(messageRepository.findByDisappearsAtBeforeAndDeletedFalse(any(Instant.class)))
                .thenReturn(List.of(expired));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        messageService.purgeExpiredMessages();

        ArgumentCaptor<Message> captor = ArgumentCaptor.forClass(Message.class);
        verify(messageRepository).save(captor.capture());
        assertThat(captor.getValue().isDeleted()).isTrue();
        assertThat(captor.getValue().getContent()).contains("disappeared");
    }

    @Test
    void purgeExpiredMessages_broadcastsToDMParticipants() {
        Message expired = new Message();
        expired.setId("exp-dm");
        expired.setRoomId("dm:conv-1");
        expired.setContent("disappears");
        expired.setDeleted(false);
        expired.setDisappearsAt(Instant.now().minusSeconds(5));
        expired.setStarred(new ArrayList<>());
        expired.setReadBy(new ArrayList<>());
        expired.setReadAt(new HashMap<>());
        expired.setReactions(new HashMap<>());

        when(messageRepository.findByDisappearsAtBeforeAndDeletedFalse(any(Instant.class)))
                .thenReturn(List.of(expired));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(testConversation));

        messageService.purgeExpiredMessages();

        verify(messagingTemplate).convertAndSendToUser(eq("alice"), anyString(), any());
        verify(messagingTemplate).convertAndSendToUser(eq("bob"), anyString(), any());
    }
}
