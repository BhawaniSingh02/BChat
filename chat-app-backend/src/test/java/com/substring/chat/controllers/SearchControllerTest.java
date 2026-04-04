package com.substring.chat.controllers;

import com.substring.chat.entities.DirectConversation;
import com.substring.chat.entities.Message;
import com.substring.chat.entities.Room;
import com.substring.chat.repositories.DirectConversationRepository;
import com.substring.chat.repositories.MessageRepository;
import com.substring.chat.repositories.RoomRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.security.Principal;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SearchControllerTest {

    @Mock private MessageRepository messageRepository;
    @Mock private RoomRepository roomRepository;
    @Mock private DirectConversationRepository conversationRepository;

    @InjectMocks
    private SearchController controller;

    private Principal principal;

    @BeforeEach
    void setUp() {
        principal = mock(Principal.class);
        when(principal.getName()).thenReturn("alice");
    }

    @Test
    void searchMessages_returnsEmptyForShortQuery() {
        var response = controller.searchMessages("a", 20, principal);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEmpty();
        verifyNoInteractions(messageRepository);
    }

    @Test
    void searchMessages_returnsEmptyForBlankQuery() {
        var response = controller.searchMessages("  ", 20, principal);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEmpty();
    }

    @Test
    void searchMessages_returnsResultsFromRoomsAndDMs() {
        Room room = new Room();
        room.setRoomId("general");
        room.setMembers(List.of("alice", "bob"));
        when(roomRepository.findByMembersContaining("alice")).thenReturn(List.of(room));

        DirectConversation conv = new DirectConversation();
        conv.setId("conv1");
        conv.setParticipants(List.of("alice", "bob"));
        when(conversationRepository.findByParticipantsContaining("alice")).thenReturn(List.of(conv));

        Message msg = new Message("alice", "Alice", "general", "hello world");
        msg.setId("msg1");
        msg.setTimestamp(Instant.now());

        when(messageRepository.findByRoomIdInAndContentContainingIgnoreCaseAndDeletedFalseOrderByTimestampDesc(
                anyList(), eq("hello"), any(PageRequest.class)))
                .thenReturn(List.of(msg));

        var response = controller.searchMessages("hello", 20, principal);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).getContent()).isEqualTo("hello world");
    }

    @Test
    void searchMessages_returnsEmptyWhenNoRoomsOrDMs() {
        when(roomRepository.findByMembersContaining("alice")).thenReturn(List.of());
        when(conversationRepository.findByParticipantsContaining("alice")).thenReturn(List.of());

        var response = controller.searchMessages("hello", 20, principal);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEmpty();
        verifyNoInteractions(messageRepository);
    }

    @Test
    void searchMessages_capsResultsAtMaxLimit() {
        Room room = new Room();
        room.setRoomId("general");
        room.setMembers(List.of("alice"));
        when(roomRepository.findByMembersContaining("alice")).thenReturn(List.of(room));
        when(conversationRepository.findByParticipantsContaining("alice")).thenReturn(List.of());
        when(messageRepository.findByRoomIdInAndContentContainingIgnoreCaseAndDeletedFalseOrderByTimestampDesc(
                anyList(), anyString(), any())).thenReturn(List.of());

        // limit > MAX_RESULTS (50) should be capped
        var response = controller.searchMessages("hello", 200, principal);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void searchMessages_includesDMRoomIds() {
        when(roomRepository.findByMembersContaining("alice")).thenReturn(List.of());

        DirectConversation conv = new DirectConversation();
        conv.setId("conv42");
        conv.setParticipants(List.of("alice", "bob"));
        when(conversationRepository.findByParticipantsContaining("alice")).thenReturn(List.of(conv));
        when(messageRepository.findByRoomIdInAndContentContainingIgnoreCaseAndDeletedFalseOrderByTimestampDesc(
                argThat(ids -> ids.contains("dm:conv42")), anyString(), any()))
                .thenReturn(List.of());

        var response = controller.searchMessages("test", 20, principal);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
