package com.substring.chat.services;

import com.substring.chat.dto.request.SendDirectMessageRequest;
import com.substring.chat.dto.response.CursorPage;
import com.substring.chat.dto.response.DirectConversationResponse;
import com.substring.chat.dto.response.MessageResponse;
import com.substring.chat.entities.DirectConversation;
import com.substring.chat.entities.Message;
import com.substring.chat.exceptions.ConversationNotFoundException;
import com.substring.chat.exceptions.UserNotFoundException;
import com.substring.chat.repositories.DirectConversationRepository;
import com.substring.chat.repositories.MessageRepository;
import com.substring.chat.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DirectMessageServiceTest {

    @Mock
    private DirectConversationRepository conversationRepository;
    @Mock
    private MessageRepository messageRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private DirectMessageService directMessageService;

    private DirectConversation existingConversation;

    @BeforeEach
    void setUp() {
        existingConversation = new DirectConversation();
        existingConversation.setId("conv-1");
        List<String> participants = new ArrayList<>();
        participants.add("alice");
        participants.add("bob");
        existingConversation.setParticipants(participants);
        existingConversation.setCreatedAt(Instant.now());
    }

    @Test
    void getOrCreateConversation_returnsExistingConversation() {
        com.substring.chat.entities.User bob = new com.substring.chat.entities.User();
        bob.setUsername("bob");
        when(userRepository.findByUsername("bob")).thenReturn(Optional.of(bob));
        when(conversationRepository.findByBothParticipants("alice", "bob"))
                .thenReturn(Optional.of(existingConversation));

        DirectConversationResponse response = directMessageService.getOrCreateConversation("alice", "bob");

        assertThat(response.getId()).isEqualTo("conv-1");
        assertThat(response.getParticipants()).containsExactlyInAnyOrder("alice", "bob");
    }

    @Test
    void getOrCreateConversation_createsNewConversationWhenNotExists() {
        com.substring.chat.entities.User charlie = new com.substring.chat.entities.User();
        charlie.setUsername("charlie");
        when(userRepository.findByUsername("charlie")).thenReturn(Optional.of(charlie));
        when(conversationRepository.findByBothParticipants("alice", "charlie"))
                .thenReturn(Optional.empty());

        DirectConversation newConv = new DirectConversation();
        newConv.setId("conv-new");
        List<String> participants = new ArrayList<>();
        participants.add("alice");
        participants.add("charlie");
        newConv.setParticipants(participants);
        newConv.setCreatedAt(Instant.now());
        when(conversationRepository.save(any(DirectConversation.class))).thenReturn(newConv);

        DirectConversationResponse response = directMessageService.getOrCreateConversation("alice", "charlie");

        assertThat(response.getId()).isEqualTo("conv-new");
        assertThat(response.getParticipants()).containsExactlyInAnyOrder("alice", "charlie");
    }

    @Test
    void getOrCreateConversation_throwsWhenOtherUserNotFound() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());
        when(userRepository.findByUniqueHandleIgnoreCase("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> directMessageService.getOrCreateConversation("alice", "ghost"))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessageContaining("ghost");
    }

    @Test
    void getConversationsForUser_returnsUserConversations() {
        when(conversationRepository.findByParticipantsContaining("alice"))
                .thenReturn(List.of(existingConversation));

        List<DirectConversationResponse> conversations = directMessageService.getConversationsForUser("alice");

        assertThat(conversations).hasSize(1);
        assertThat(conversations.get(0).getParticipants()).contains("alice");
    }

    @Test
    void sendMessage_persistsAndReturnsMessage() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(existingConversation));

        Message saved = new Message();
        saved.setId("msg-1");
        saved.setRoomId("dm:conv-1");
        saved.setSender("alice");
        saved.setContent("Hello Bob!");
        saved.setMessageType(Message.MessageType.TEXT);
        saved.setTimestamp(Instant.now());
        saved.setReadBy(new ArrayList<>());
        when(messageRepository.save(any(Message.class))).thenReturn(saved);
        when(conversationRepository.save(any(DirectConversation.class))).thenReturn(existingConversation);

        SendDirectMessageRequest request = new SendDirectMessageRequest();
        request.setContent("Hello Bob!");

        MessageResponse response = directMessageService.sendMessage("conv-1", "alice", request);

        assertThat(response.getContent()).isEqualTo("Hello Bob!");
        assertThat(response.getSender()).isEqualTo("alice");
        assertThat(response.getRoomId()).isEqualTo("dm:conv-1");
    }

    @Test
    void sendMessage_denormalizesTextPreviewOntoConversation() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(existingConversation));

        Message saved = new Message();
        saved.setId("msg-1");
        saved.setRoomId("dm:conv-1");
        saved.setSender("alice");
        saved.setContent("Hello Bob!");
        saved.setMessageType(Message.MessageType.TEXT);
        saved.setTimestamp(Instant.now());
        saved.setReadBy(new ArrayList<>());
        when(messageRepository.save(any(Message.class))).thenReturn(saved);
        when(conversationRepository.save(any(DirectConversation.class))).thenReturn(existingConversation);

        SendDirectMessageRequest request = new SendDirectMessageRequest();
        request.setContent("Hello Bob!");

        directMessageService.sendMessage("conv-1", "alice", request);

        assertThat(existingConversation.getLastMessagePreview()).isEqualTo("Hello Bob!");
        assertThat(existingConversation.getLastMessageType()).isEqualTo("TEXT");
        assertThat(existingConversation.getLastMessageSender()).isEqualTo("alice");
        assertThat(existingConversation.getLastMessageAt()).isEqualTo(saved.getTimestamp());
    }

    @Test
    void sendMessage_usesMediaLabelPreviewForImage() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(existingConversation));

        Message saved = new Message();
        saved.setId("msg-2");
        saved.setRoomId("dm:conv-1");
        saved.setSender("alice");
        saved.setContent("");
        saved.setMessageType(Message.MessageType.IMAGE);
        saved.setTimestamp(Instant.now());
        saved.setReadBy(new ArrayList<>());
        when(messageRepository.save(any(Message.class))).thenReturn(saved);
        when(conversationRepository.save(any(DirectConversation.class))).thenReturn(existingConversation);

        SendDirectMessageRequest request = new SendDirectMessageRequest();
        request.setContent("");
        request.setMessageType(Message.MessageType.IMAGE);
        request.setFileUrl("https://cdn/x.png");

        directMessageService.sendMessage("conv-1", "alice", request);

        assertThat(existingConversation.getLastMessagePreview()).isEqualTo("📷 Photo");
        assertThat(existingConversation.getLastMessageType()).isEqualTo("IMAGE");
    }

    @Test
    void sendMessage_throwsWhenConversationNotFound() {
        when(conversationRepository.findById("bad-conv")).thenReturn(Optional.empty());

        SendDirectMessageRequest request = new SendDirectMessageRequest();
        request.setContent("Hello!");

        assertThatThrownBy(() -> directMessageService.sendMessage("bad-conv", "alice", request))
                .isInstanceOf(ConversationNotFoundException.class)
                .hasMessageContaining("bad-conv");
    }

    @Test
    void sendMessage_throwsWhenUserNotInConversation() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(existingConversation));

        SendDirectMessageRequest request = new SendDirectMessageRequest();
        request.setContent("Hello!");

        assertThatThrownBy(() -> directMessageService.sendMessage("conv-1", "eve", request))
                .isInstanceOf(ConversationNotFoundException.class);
    }

    @Test
    void getMessages_throwsWhenConversationNotFound() {
        when(conversationRepository.findById("bad")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> directMessageService.getMessages("bad", "alice", null, 50))
                .isInstanceOf(ConversationNotFoundException.class);
    }

    @Test
    void getMessages_throwsWhenUserNotInConversation() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(existingConversation));

        assertThatThrownBy(() -> directMessageService.getMessages("conv-1", "eve", null, 50))
                .isInstanceOf(ConversationNotFoundException.class);
    }

    @Test
    void getMessages_returnsCursorPage() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(existingConversation));

        Message msg = new Message();
        msg.setId("msg-1");
        msg.setRoomId("dm:conv-1");
        msg.setSender("alice");
        msg.setContent("hi");
        msg.setMessageType(Message.MessageType.TEXT);
        msg.setTimestamp(Instant.now());
        msg.setReadBy(new ArrayList<>());
        Page<Message> page = new PageImpl<>(List.of(msg));
        when(messageRepository.findByRoomIdAndTimestampBeforeOrderByTimestampDesc(
                eq("dm:conv-1"), any(Instant.class), any(Pageable.class)))
                .thenReturn(page);

        CursorPage<MessageResponse> result = directMessageService.getMessages("conv-1", "alice", null, 50);

        assertThat(result.content()).hasSize(1);
        assertThat(result.content().get(0).getContent()).isEqualTo("hi");
        assertThat(result.nextCursor()).isEqualTo(msg.getTimestamp().toEpochMilli());
        assertThat(result.hasMore()).isFalse();
    }

    @Test
    void getMessages_usesBeforeCursorAsInstant() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(existingConversation));
        when(messageRepository.findByRoomIdAndTimestampBeforeOrderByTimestampDesc(
                eq("dm:conv-1"), eq(Instant.ofEpochMilli(1_000L)), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        CursorPage<MessageResponse> result = directMessageService.getMessages("conv-1", "alice", 1_000L, 50);

        assertThat(result.content()).isEmpty();
        assertThat(result.nextCursor()).isNull();
        assertThat(result.hasMore()).isFalse();
    }

    @Test
    void getMessages_hasMoreTrueWhenAnotherPageExists() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(existingConversation));

        Message msg = new Message();
        msg.setId("msg-1");
        msg.setRoomId("dm:conv-1");
        msg.setSender("alice");
        msg.setContent("hi");
        msg.setMessageType(Message.MessageType.TEXT);
        msg.setTimestamp(Instant.now());
        msg.setReadBy(new ArrayList<>());
        Page<Message> page = new PageImpl<>(List.of(msg), Pageable.ofSize(1), 2);
        when(messageRepository.findByRoomIdAndTimestampBeforeOrderByTimestampDesc(
                eq("dm:conv-1"), any(Instant.class), any(Pageable.class)))
                .thenReturn(page);

        CursorPage<MessageResponse> result = directMessageService.getMessages("conv-1", "alice", null, 1);

        assertThat(result.hasMore()).isTrue();
    }

    // ── Message requests ──────────────────────────────────────────────────────

    private com.substring.chat.entities.User userWith(String username, String whoCanMessage) {
        com.substring.chat.entities.User u = new com.substring.chat.entities.User();
        u.setUsername(username);
        u.setWhoCanMessage(whoCanMessage);
        return u;
    }

    private DirectConversation pendingConv(String id, String initiator, String recipient) {
        DirectConversation c = new DirectConversation();
        c.setId(id);
        c.setParticipants(new ArrayList<>(List.of(initiator, recipient)));
        c.setStatus("PENDING");
        c.setInitiatedBy(initiator);
        return c;
    }

    @Test
    void getOrCreate_createsPendingRequest_whenRecipientApprovedOnly() {
        when(userRepository.findByUsername("bob")).thenReturn(Optional.of(userWith("bob", "APPROVED_ONLY")));
        when(conversationRepository.findByBothParticipants("alice", "bob")).thenReturn(Optional.empty());
        when(conversationRepository.save(any(DirectConversation.class))).thenAnswer(inv -> inv.getArgument(0));

        DirectConversationResponse resp = directMessageService.getOrCreateConversation("alice", "bob");

        assertThat(resp.getStatus()).isEqualTo("PENDING");
        assertThat(resp.getInitiatedBy()).isEqualTo("alice");
    }

    @Test
    void getOrCreate_autoAccepts_whenRecipientAllowsAnyone() {
        when(userRepository.findByUsername("bob")).thenReturn(Optional.of(userWith("bob", "ANYONE")));
        when(conversationRepository.findByBothParticipants("alice", "bob")).thenReturn(Optional.empty());
        when(conversationRepository.save(any(DirectConversation.class))).thenAnswer(inv -> inv.getArgument(0));

        DirectConversationResponse resp = directMessageService.getOrCreateConversation("alice", "bob");

        assertThat(resp.getStatus()).isEqualTo("ACCEPTED");
        assertThat(resp.getInitiatedBy()).isNull();
    }

    @Test
    void getOrCreate_throwsWhenRecipientAcceptsNobody() {
        when(userRepository.findByUsername("bob")).thenReturn(Optional.of(userWith("bob", "NOBODY")));
        when(conversationRepository.findByBothParticipants("alice", "bob")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> directMessageService.getOrCreateConversation("alice", "bob"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }

    @Test
    void requestsAndInbox_areSeparated() {
        DirectConversation req = pendingConv("c1", "alice", "bob");
        when(conversationRepository.findByParticipantsContaining("bob")).thenReturn(List.of(req));
        when(conversationRepository.findByParticipantsContaining("alice")).thenReturn(List.of(req));

        // Recipient: request shows in Requests, NOT in the main inbox.
        assertThat(directMessageService.getRequestsForUser("bob")).hasSize(1);
        assertThat(directMessageService.getConversationsForUser("bob")).isEmpty();
        // Initiator: their sent request stays in their main inbox, not in Requests.
        assertThat(directMessageService.getConversationsForUser("alice")).hasSize(1);
        assertThat(directMessageService.getRequestsForUser("alice")).isEmpty();
    }

    @Test
    void acceptRequest_promotesToAccepted_forRecipientOnly() {
        DirectConversation req = pendingConv("c1", "alice", "bob");
        when(conversationRepository.findById("c1")).thenReturn(Optional.of(req));
        when(conversationRepository.save(any(DirectConversation.class))).thenAnswer(inv -> inv.getArgument(0));

        DirectConversationResponse resp = directMessageService.acceptRequest("c1", "bob");
        assertThat(resp.getStatus()).isEqualTo("ACCEPTED");
    }

    @Test
    void acceptRequest_rejectsTheInitiator() {
        DirectConversation req = pendingConv("c1", "alice", "bob");
        when(conversationRepository.findById("c1")).thenReturn(Optional.of(req));

        // The initiator cannot accept their own request.
        assertThatThrownBy(() -> directMessageService.acceptRequest("c1", "alice"))
                .isInstanceOf(ConversationNotFoundException.class);
    }

    @Test
    void declineRequest_deletesConversationAndMessages() {
        DirectConversation req = pendingConv("c1", "alice", "bob");
        when(conversationRepository.findById("c1")).thenReturn(Optional.of(req));

        directMessageService.declineRequest("c1", "bob");

        verify(messageRepository).deleteByRoomId("dm:c1");
        verify(conversationRepository).delete(req);
    }
}
