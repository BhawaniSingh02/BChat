package com.substring.chat.controllers;

import com.substring.chat.entities.Message;
import com.substring.chat.entities.Room;
import com.substring.chat.repositories.DirectConversationRepository;
import com.substring.chat.repositories.MessageRepository;
import com.substring.chat.repositories.RoomRepository;
import com.substring.chat.services.MessageRateLimiter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class ThreadControllerTest {

    @Mock private MessageRepository messageRepository;
    @Mock private RoomRepository roomRepository;
    @Mock private DirectConversationRepository conversationRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private MessageRateLimiter rateLimiter;

    @InjectMocks
    private ThreadController controller;

    private Principal principal;

    @BeforeEach
    void setUp() {
        principal = mock(Principal.class);
        lenient().when(principal.getName()).thenReturn("alice");
    }

    // ── REST: getThreadReplies ─────────────────────────────────────────────

    @Test
    void getThreadReplies_returnsRepliesInOrder() {
        Message r1 = new Message("bob", "Bob", "general", "reply 1");
        r1.setId("r1");
        r1.setTimestamp(Instant.parse("2025-01-01T10:00:00Z"));
        r1.setThreadId("root1");

        Message r2 = new Message("alice", "Alice", "general", "reply 2");
        r2.setId("r2");
        r2.setTimestamp(Instant.parse("2025-01-01T10:01:00Z"));
        r2.setThreadId("root1");

        when(messageRepository.findByThreadIdOrderByTimestampAsc("root1"))
                .thenReturn(List.of(r1, r2));

        var response = controller.getThreadReplies("root1");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(2);
        assertThat(response.getBody().get(0).getContent()).isEqualTo("reply 1");
        assertThat(response.getBody().get(1).getContent()).isEqualTo("reply 2");
    }

    @Test
    void getThreadReplies_returnsEmptyWhenNoReplies() {
        when(messageRepository.findByThreadIdOrderByTimestampAsc("root99"))
                .thenReturn(List.of());

        var response = controller.getThreadReplies("root99");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEmpty();
    }

    // ── STOMP: replyInThread ──────────────────────────────────────────────

    @Test
    void replyInThread_savesReplyAndBroadcasts() {
        when(rateLimiter.isAllowed("alice")).thenReturn(true);

        Message root = new Message("bob", "Bob", "general", "root message");
        root.setId("root1");
        root.setRoomId("general");
        root.setTimestamp(Instant.now());

        Room room = new Room();
        room.setRoomId("general");
        room.setMembers(List.of("alice", "bob"));

        when(messageRepository.findById("root1")).thenReturn(Optional.of(root));
        when(roomRepository.findByRoomId("general")).thenReturn(room);

        var request = new com.substring.chat.dto.request.SendMessageRequest();
        request.setContent("great point");
        request.setSenderName("Alice");

        controller.replyInThread("root1", request, principal);

        // Reply saved
        ArgumentCaptor<Message> captor = ArgumentCaptor.forClass(Message.class);
        verify(messageRepository, times(2)).save(captor.capture()); // reply + updated root

        List<Message> saved = captor.getAllValues();
        Message savedReply = saved.get(0);
        assertThat(savedReply.getContent()).isEqualTo("great point");
        assertThat(savedReply.getThreadId()).isEqualTo("root1");
        assertThat(savedReply.getSender()).isEqualTo("alice");

        // Root reply count incremented
        Message savedRoot = saved.get(1);
        assertThat(savedRoot.getThreadReplyCount()).isEqualTo(1);

        // Broadcast to thread topic
        verify(messagingTemplate).convertAndSend(eq("/topic/thread/root1"), any(Object.class));
        // Broadcast updated root to room
        verify(messagingTemplate).convertAndSend(eq("/topic/room/general"), any(Object.class));
    }

    @Test
    void replyInThread_dropsWhenRateLimited() {
        when(rateLimiter.isAllowed("alice")).thenReturn(false);

        var request = new com.substring.chat.dto.request.SendMessageRequest();
        request.setContent("spam");

        controller.replyInThread("root1", request, principal);

        verifyNoInteractions(messageRepository, messagingTemplate);
    }

    @Test
    void replyInThread_dropsWhenRootMessageMissing() {
        when(rateLimiter.isAllowed("alice")).thenReturn(true);
        when(messageRepository.findById("missing")).thenReturn(Optional.empty());

        var request = new com.substring.chat.dto.request.SendMessageRequest();
        request.setContent("reply");

        controller.replyInThread("missing", request, principal);

        verify(messageRepository, never()).save(any());
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void replyInThread_dropsWhenRootIsDeleted() {
        when(rateLimiter.isAllowed("alice")).thenReturn(true);

        Message root = new Message("bob", "Bob", "general", "deleted message");
        root.setId("root1");
        root.setDeleted(true);
        when(messageRepository.findById("root1")).thenReturn(Optional.of(root));

        var request = new com.substring.chat.dto.request.SendMessageRequest();
        request.setContent("reply");

        controller.replyInThread("root1", request, principal);

        verify(messageRepository, never()).save(any());
    }

    @Test
    void replyInThread_dropsWhenUserNotRoomMember() {
        when(rateLimiter.isAllowed("alice")).thenReturn(true);

        Message root = new Message("bob", "Bob", "secret", "root");
        root.setId("root1");
        root.setRoomId("secret");
        when(messageRepository.findById("root1")).thenReturn(Optional.of(root));

        Room room = new Room();
        room.setRoomId("secret");
        room.setMembers(List.of("bob")); // alice not a member
        when(roomRepository.findByRoomId("secret")).thenReturn(room);

        var request = new com.substring.chat.dto.request.SendMessageRequest();
        request.setContent("snoop");

        controller.replyInThread("root1", request, principal);

        verify(messageRepository, never()).save(any());
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void replyInThread_broadcastsToDMTopicForDMRooms() {
        when(rateLimiter.isAllowed("alice")).thenReturn(true);

        Message root = new Message("bob", "Bob", "dm:conv42", "dm root");
        root.setId("root1");
        root.setRoomId("dm:conv42");
        root.setTimestamp(Instant.now());
        when(messageRepository.findById("root1")).thenReturn(Optional.of(root));

        var conv = new com.substring.chat.entities.DirectConversation();
        conv.setId("conv42");
        conv.setParticipants(List.of("alice", "bob"));
        when(conversationRepository.findById("conv42")).thenReturn(Optional.of(conv));

        var request = new com.substring.chat.dto.request.SendMessageRequest();
        request.setContent("dm reply");

        controller.replyInThread("root1", request, principal);

        verify(messagingTemplate).convertAndSend(eq("/topic/thread/root1"), any(Object.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/dm/conv42"), any(Object.class));
    }
}
