package com.substring.chat.controllers;

import com.substring.chat.entities.DirectConversation;
import com.substring.chat.entities.Message;
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
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatControllerTest {

    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private MessageRepository messageRepository;
    @Mock private RoomRepository roomRepository;
    @Mock private DirectConversationRepository conversationRepository;
    @Mock private MessageRateLimiter rateLimiter;

    @InjectMocks
    private ChatController chatController;

    private Principal principal;
    private Message message;
    private Message dmMessage;
    private DirectConversation conversation;

    @BeforeEach
    void setUp() {
        principal = () -> "alice";
        message = new Message();
        message.setId("msg-1");
        message.setRoomId("general");
        message.setSender("alice");
        message.setSenderName("alice");
        message.setContent("Hello");
        message.setMessageType(Message.MessageType.TEXT);
        message.setTimestamp(LocalDateTime.now());

        conversation = new DirectConversation();
        conversation.setId("conv-1");
        conversation.setParticipants(new ArrayList<>(List.of("alice", "bob")));

        dmMessage = new Message();
        dmMessage.setId("dm-msg-1");
        dmMessage.setRoomId("dm:conv-1");
        dmMessage.setSender("alice");
        dmMessage.setSenderName("alice");
        dmMessage.setContent("DM hello");
        dmMessage.setMessageType(Message.MessageType.TEXT);
        dmMessage.setTimestamp(LocalDateTime.now());
    }

    // ── react to message ──────────────────────────────────────────────────────

    @Test
    void reactToMessage_addsReactionForFirstUser() {
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(message));
        when(messageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ChatController.ReactMessageWsRequest request = new ChatController.ReactMessageWsRequest();
        request.setMessageId("msg-1");
        request.setEmoji("👍");

        chatController.reactToMessage("general", request, principal);

        assertThat(message.getReactions()).containsKey("👍");
        assertThat(message.getReactions().get("👍")).containsExactly("alice");
        verify(messageRepository).save(message);
        verify(messagingTemplate).convertAndSend(eq("/topic/room/general"), any(Object.class));
    }

    @Test
    void reactToMessage_togglesOffWhenAlreadyReacted() {
        message.getReactions().put("👍", new ArrayList<>(List.of("alice")));
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(message));
        when(messageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ChatController.ReactMessageWsRequest request = new ChatController.ReactMessageWsRequest();
        request.setMessageId("msg-1");
        request.setEmoji("👍");

        chatController.reactToMessage("general", request, principal);

        // alice toggled off — emoji key should be removed (no users left)
        assertThat(message.getReactions()).doesNotContainKey("👍");
        verify(messagingTemplate).convertAndSend(eq("/topic/room/general"), any(Object.class));
    }

    @Test
    void reactToMessage_multipleUsersSameEmoji() {
        message.getReactions().put("❤️", new ArrayList<>(List.of("bob")));
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(message));
        when(messageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ChatController.ReactMessageWsRequest request = new ChatController.ReactMessageWsRequest();
        request.setMessageId("msg-1");
        request.setEmoji("❤️");

        chatController.reactToMessage("general", request, principal);

        assertThat(message.getReactions().get("❤️")).containsExactlyInAnyOrder("bob", "alice");
        verify(messagingTemplate).convertAndSend(eq("/topic/room/general"), any(Object.class));
    }

    @Test
    void reactToMessage_doesNothingWhenMessageNotFound() {
        when(messageRepository.findById("unknown")).thenReturn(Optional.empty());

        ChatController.ReactMessageWsRequest request = new ChatController.ReactMessageWsRequest();
        request.setMessageId("unknown");
        request.setEmoji("👍");

        chatController.reactToMessage("general", request, principal);

        verify(messageRepository, never()).save(any());
        verify(messagingTemplate, never()).convertAndSend(any(String.class), any(Object.class));
    }

    @Test
    void reactToMessage_supportsMultipleDifferentEmojis() {
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(message));
        when(messageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ChatController.ReactMessageWsRequest r1 = new ChatController.ReactMessageWsRequest();
        r1.setMessageId("msg-1");
        r1.setEmoji("👍");
        chatController.reactToMessage("general", r1, principal);

        ChatController.ReactMessageWsRequest r2 = new ChatController.ReactMessageWsRequest();
        r2.setMessageId("msg-1");
        r2.setEmoji("😂");
        chatController.reactToMessage("general", r2, principal);

        assertThat(message.getReactions()).containsKeys("👍", "😂");
    }

    // ── edit message ──────────────────────────────────────────────────────────

    @Test
    void editMessageWs_updatesContentAndBroadcasts() {
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(message));
        when(messageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ChatController.EditMessageWsRequest request = new ChatController.EditMessageWsRequest();
        request.setMessageId("msg-1");
        request.setContent("Updated content");

        chatController.editMessageWs("general", request, principal);

        assertThat(message.getContent()).isEqualTo("Updated content");
        assertThat(message.isEdited()).isTrue();
        verify(messagingTemplate).convertAndSend(eq("/topic/room/general"), any(Object.class));
    }

    @Test
    void editMessageWs_ignoresWhenNotOwnMessage() {
        message.setSender("bob");
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(message));

        ChatController.EditMessageWsRequest request = new ChatController.EditMessageWsRequest();
        request.setMessageId("msg-1");
        request.setContent("Hacked");

        chatController.editMessageWs("general", request, principal);

        assertThat(message.getContent()).isEqualTo("Hello"); // unchanged
        verify(messageRepository, never()).save(any());
    }

    // ── delete message ────────────────────────────────────────────────────────

    @Test
    void deleteMessageWs_softDeletesAndBroadcasts() {
        when(messageRepository.findById("msg-1")).thenReturn(Optional.of(message));
        when(messageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ChatController.DeleteMessageWsRequest request = new ChatController.DeleteMessageWsRequest();
        request.setMessageId("msg-1");

        chatController.deleteMessageWs("general", request, principal);

        assertThat(message.isDeleted()).isTrue();
        assertThat(message.getContent()).isEqualTo("[This message was deleted]");
        verify(messagingTemplate).convertAndSend(eq("/topic/room/general"), any(Object.class));
    }

    // ── DM edit message ───────────────────────────────────────────────────────

    @Test
    void editDMMessage_updatesContentAndDeliversToParticipants() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(conversation));
        when(messageRepository.findById("dm-msg-1")).thenReturn(Optional.of(dmMessage));
        when(messageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ChatController.EditMessageWsRequest request = new ChatController.EditMessageWsRequest();
        request.setMessageId("dm-msg-1");
        request.setContent("Updated DM content");

        chatController.editDMMessage("conv-1", request, principal);

        assertThat(dmMessage.getContent()).isEqualTo("Updated DM content");
        assertThat(dmMessage.isEdited()).isTrue();
        assertThat(dmMessage.getEditedAt()).isNotNull();
        verify(messagingTemplate).convertAndSendToUser(eq("alice"), eq("/queue/messages"), any(Object.class));
        verify(messagingTemplate).convertAndSendToUser(eq("bob"), eq("/queue/messages"), any(Object.class));
    }

    @Test
    void editDMMessage_ignoresWhenNotOwnMessage() {
        dmMessage.setSender("bob");
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(conversation));
        when(messageRepository.findById("dm-msg-1")).thenReturn(Optional.of(dmMessage));

        ChatController.EditMessageWsRequest request = new ChatController.EditMessageWsRequest();
        request.setMessageId("dm-msg-1");
        request.setContent("Hacked DM");

        chatController.editDMMessage("conv-1", request, principal);

        assertThat(dmMessage.getContent()).isEqualTo("DM hello");
        verify(messageRepository, never()).save(any());
    }

    @Test
    void editDMMessage_ignoresWhenUserNotParticipant() {
        conversation.setParticipants(List.of("bob", "charlie"));
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(conversation));

        ChatController.EditMessageWsRequest request = new ChatController.EditMessageWsRequest();
        request.setMessageId("dm-msg-1");
        request.setContent("Unauthorized");

        chatController.editDMMessage("conv-1", request, principal);

        verify(messageRepository, never()).findById(any());
        verify(messagingTemplate, never()).convertAndSendToUser(any(), any(), any());
    }

    @Test
    void editDMMessage_ignoresWhenConversationNotFound() {
        when(conversationRepository.findById("bad-conv")).thenReturn(Optional.empty());

        ChatController.EditMessageWsRequest request = new ChatController.EditMessageWsRequest();
        request.setMessageId("dm-msg-1");
        request.setContent("Edit");

        chatController.editDMMessage("bad-conv", request, principal);

        verify(messageRepository, never()).findById(any());
    }

    // ── DM delete message ─────────────────────────────────────────────────────

    @Test
    void deleteDMMessage_softDeletesAndDeliversToParticipants() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(conversation));
        when(messageRepository.findById("dm-msg-1")).thenReturn(Optional.of(dmMessage));
        when(messageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ChatController.DeleteMessageWsRequest request = new ChatController.DeleteMessageWsRequest();
        request.setMessageId("dm-msg-1");

        chatController.deleteDMMessage("conv-1", request, principal);

        assertThat(dmMessage.isDeleted()).isTrue();
        assertThat(dmMessage.getContent()).isEqualTo("[This message was deleted]");
        verify(messagingTemplate).convertAndSendToUser(eq("alice"), eq("/queue/messages"), any(Object.class));
        verify(messagingTemplate).convertAndSendToUser(eq("bob"), eq("/queue/messages"), any(Object.class));
    }

    @Test
    void deleteDMMessage_ignoresWhenNotOwnMessage() {
        dmMessage.setSender("bob");
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(conversation));
        when(messageRepository.findById("dm-msg-1")).thenReturn(Optional.of(dmMessage));

        ChatController.DeleteMessageWsRequest request = new ChatController.DeleteMessageWsRequest();
        request.setMessageId("dm-msg-1");

        chatController.deleteDMMessage("conv-1", request, principal);

        assertThat(dmMessage.isDeleted()).isFalse();
        verify(messageRepository, never()).save(any());
    }

    @Test
    void deleteDMMessage_ignoresWhenUserNotParticipant() {
        conversation.setParticipants(List.of("bob", "charlie"));
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(conversation));

        ChatController.DeleteMessageWsRequest request = new ChatController.DeleteMessageWsRequest();
        request.setMessageId("dm-msg-1");

        chatController.deleteDMMessage("conv-1", request, principal);

        verify(messageRepository, never()).findById(any());
    }

    // ── DM react to message ───────────────────────────────────────────────────

    @Test
    void reactToDMMessage_addsReactionAndDeliversToParticipants() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(conversation));
        when(messageRepository.findById("dm-msg-1")).thenReturn(Optional.of(dmMessage));
        when(messageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ChatController.ReactMessageWsRequest request = new ChatController.ReactMessageWsRequest();
        request.setMessageId("dm-msg-1");
        request.setEmoji("❤️");

        chatController.reactToDMMessage("conv-1", request, principal);

        assertThat(dmMessage.getReactions()).containsKey("❤️");
        assertThat(dmMessage.getReactions().get("❤️")).containsExactly("alice");
        verify(messagingTemplate).convertAndSendToUser(eq("alice"), eq("/queue/messages"), any(Object.class));
        verify(messagingTemplate).convertAndSendToUser(eq("bob"), eq("/queue/messages"), any(Object.class));
    }

    @Test
    void reactToDMMessage_togglesOffExistingReaction() {
        dmMessage.getReactions().put("👍", new ArrayList<>(List.of("alice")));
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(conversation));
        when(messageRepository.findById("dm-msg-1")).thenReturn(Optional.of(dmMessage));
        when(messageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ChatController.ReactMessageWsRequest request = new ChatController.ReactMessageWsRequest();
        request.setMessageId("dm-msg-1");
        request.setEmoji("👍");

        chatController.reactToDMMessage("conv-1", request, principal);

        assertThat(dmMessage.getReactions()).doesNotContainKey("👍");
    }

    @Test
    void reactToDMMessage_ignoresWhenUserNotParticipant() {
        conversation.setParticipants(List.of("bob", "charlie"));
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(conversation));

        ChatController.ReactMessageWsRequest request = new ChatController.ReactMessageWsRequest();
        request.setMessageId("dm-msg-1");
        request.setEmoji("👍");

        chatController.reactToDMMessage("conv-1", request, principal);

        verify(messageRepository, never()).findById(any());
    }

    @Test
    void reactToDMMessage_ignoresWrongConversation() {
        // message belongs to a different conversation
        dmMessage.setRoomId("dm:other-conv");
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(conversation));
        when(messageRepository.findById("dm-msg-1")).thenReturn(Optional.of(dmMessage));

        ChatController.ReactMessageWsRequest request = new ChatController.ReactMessageWsRequest();
        request.setMessageId("dm-msg-1");
        request.setEmoji("👍");

        chatController.reactToDMMessage("conv-1", request, principal);

        verify(messageRepository, never()).save(any());
    }
}
