package com.substring.chat.services;

import com.substring.chat.dto.request.SendDirectMessageRequest;
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

import java.time.LocalDateTime;
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
        existingConversation.setCreatedAt(LocalDateTime.now());
    }

    @Test
    void getOrCreateConversation_returnsExistingConversation() {
        when(userRepository.existsByUsername("bob")).thenReturn(true);
        when(conversationRepository.findByBothParticipants("alice", "bob"))
                .thenReturn(Optional.of(existingConversation));

        DirectConversationResponse response = directMessageService.getOrCreateConversation("alice", "bob");

        assertThat(response.getId()).isEqualTo("conv-1");
        assertThat(response.getParticipants()).containsExactlyInAnyOrder("alice", "bob");
    }

    @Test
    void getOrCreateConversation_createsNewConversationWhenNotExists() {
        when(userRepository.existsByUsername("charlie")).thenReturn(true);
        when(conversationRepository.findByBothParticipants("alice", "charlie"))
                .thenReturn(Optional.empty());

        DirectConversation newConv = new DirectConversation();
        newConv.setId("conv-new");
        List<String> participants = new ArrayList<>();
        participants.add("alice");
        participants.add("charlie");
        newConv.setParticipants(participants);
        newConv.setCreatedAt(LocalDateTime.now());
        when(conversationRepository.save(any(DirectConversation.class))).thenReturn(newConv);

        DirectConversationResponse response = directMessageService.getOrCreateConversation("alice", "charlie");

        assertThat(response.getId()).isEqualTo("conv-new");
        assertThat(response.getParticipants()).containsExactlyInAnyOrder("alice", "charlie");
    }

    @Test
    void getOrCreateConversation_throwsWhenOtherUserNotFound() {
        when(userRepository.existsByUsername("ghost")).thenReturn(false);

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
        saved.setTimestamp(LocalDateTime.now());
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

        assertThatThrownBy(() -> directMessageService.getMessages("bad", "alice", 0, 50))
                .isInstanceOf(ConversationNotFoundException.class);
    }

    @Test
    void getMessages_throwsWhenUserNotInConversation() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(existingConversation));

        assertThatThrownBy(() -> directMessageService.getMessages("conv-1", "eve", 0, 50))
                .isInstanceOf(ConversationNotFoundException.class);
    }

    @Test
    void getMessages_returnsPagedMessages() {
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(existingConversation));

        Message msg = new Message();
        msg.setId("msg-1");
        msg.setRoomId("dm:conv-1");
        msg.setSender("alice");
        msg.setContent("hi");
        msg.setMessageType(Message.MessageType.TEXT);
        msg.setTimestamp(LocalDateTime.now());
        msg.setReadBy(new ArrayList<>());
        Page<Message> page = new PageImpl<>(List.of(msg));
        when(messageRepository.findByRoomIdOrderByTimestampDesc(eq("dm:conv-1"), any(Pageable.class)))
                .thenReturn(page);

        Page<MessageResponse> result = directMessageService.getMessages("conv-1", "alice", 0, 50);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getContent()).isEqualTo("hi");
    }
}
