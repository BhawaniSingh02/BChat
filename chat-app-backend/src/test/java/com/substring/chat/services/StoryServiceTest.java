package com.substring.chat.services;

import com.substring.chat.dto.request.CreateStoryRequest;
import com.substring.chat.dto.response.DirectConversationResponse;
import com.substring.chat.dto.response.MessageResponse;
import com.substring.chat.dto.response.StoryGroupResponse;
import com.substring.chat.dto.response.StoryResponse;
import com.substring.chat.entities.DirectConversation;
import com.substring.chat.entities.Story;
import com.substring.chat.entities.User;
import com.substring.chat.repositories.DirectConversationRepository;
import com.substring.chat.repositories.StoryRepository;
import com.substring.chat.repositories.UserRepository;
import com.substring.chat.services.WebPushService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StoryServiceTest {

    @Mock private StoryRepository storyRepository;
    @Mock private DirectConversationRepository conversationRepository;
    @Mock private DirectMessageService directMessageService;
    @Mock private UserRepository userRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private WebPushService webPushService;
    @Mock private ExpoPushService expoPushService;

    @InjectMocks private StoryService storyService;

    private DirectConversation conv(String a, String b) {
        DirectConversation c = new DirectConversation();
        c.setParticipants(List.of(a, b));
        c.setStatus("ACCEPTED");
        return c;
    }

    private Story story(String id, String author) {
        Story s = new Story();
        s.setId(id);
        s.setAuthorId(author);
        s.setType(Story.StoryType.TEXT);
        s.setContent("hi");
        s.setCreatedAt(Instant.now());
        s.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
        s.setViewedBy(new ArrayList<>());
        return s;
    }

    @Test
    void createStory_setsExpiryAndPersists() {
        when(storyRepository.save(any(Story.class))).thenAnswer(i -> i.getArgument(0));
        CreateStoryRequest req = new CreateStoryRequest();
        req.setType("TEXT");
        req.setContent("Hello world");

        StoryResponse res = storyService.createStory("alice", req);

        assertThat(res.getAuthorId()).isEqualTo("alice");
        assertThat(res.getType()).isEqualTo("TEXT");
        assertThat(res.getExpiresAt()).isAfter(Instant.now());
    }

    @Test
    void createStory_rejectsImageWithoutMediaUrl() {
        CreateStoryRequest req = new CreateStoryRequest();
        req.setType("IMAGE");

        assertThatThrownBy(() -> storyService.createStory("alice", req))
                .isInstanceOf(ResponseStatusException.class);
        verify(storyRepository, never()).save(any());
    }

    @Test
    void createStory_rejectsEmptyTextStory() {
        CreateStoryRequest req = new CreateStoryRequest();
        req.setType("TEXT");
        req.setContent("   ");

        assertThatThrownBy(() -> storyService.createStory("alice", req))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void getFeed_groupsActiveStoriesAndPutsOwnFirst() {
        when(conversationRepository.findByParticipantsContaining("alice"))
                .thenReturn(List.of(conv("alice", "bob")));
        when(storyRepository.findByAuthorIdInAndExpiresAtAfterOrderByCreatedAtAsc(anyCollection(), any()))
                .thenReturn(List.of(story("s1", "bob"), story("s2", "alice")));

        List<StoryGroupResponse> feed = storyService.getFeed("alice");

        assertThat(feed).hasSize(2);
        assertThat(feed.get(0).getAuthorId()).isEqualTo("alice"); // own group first
        assertThat(feed).extracting(StoryGroupResponse::getAuthorId).containsExactlyInAnyOrder("alice", "bob");
    }

    @Test
    void getFeed_excludesPendingConversationParticipants() {
        DirectConversation pending = new DirectConversation();
        pending.setParticipants(List.of("alice", "stranger"));
        pending.setStatus("PENDING");
        when(conversationRepository.findByParticipantsContaining("alice")).thenReturn(List.of(pending));
        when(storyRepository.findByAuthorIdInAndExpiresAtAfterOrderByCreatedAtAsc(anyCollection(), any()))
                .thenReturn(List.of());

        storyService.getFeed("alice");

        // audience should be just {alice} — stranger excluded because the request is pending
        verify(storyRepository).findByAuthorIdInAndExpiresAtAfterOrderByCreatedAtAsc(
                argThat(set -> set.contains("alice") && !set.contains("stranger")), any());
    }

    @Test
    void markViewed_addsViewerOnce() {
        Story s = story("s1", "bob");
        when(storyRepository.findById("s1")).thenReturn(Optional.of(s));
        when(conversationRepository.findByParticipantsContaining("alice"))
                .thenReturn(List.of(conv("alice", "bob")));
        when(storyRepository.save(any(Story.class))).thenAnswer(i -> i.getArgument(0));

        storyService.markViewed("s1", "alice");
        storyService.markViewed("s1", "alice"); // second time is a no-op

        assertThat(s.getViewedBy()).containsExactly("alice");
        verify(storyRepository).save(any(Story.class)); // saved only once
    }

    @Test
    void markViewed_authorViewingOwnStoryIsNoop() {
        Story s = story("s1", "bob");
        when(storyRepository.findById("s1")).thenReturn(Optional.of(s));

        storyService.markViewed("s1", "bob");

        assertThat(s.getViewedBy()).isEmpty();
        verify(storyRepository, never()).save(any());
    }

    @Test
    void getViewers_onlyAuthorAllowed() {
        Story s = story("s1", "bob");
        s.getViewedBy().add("alice");
        when(storyRepository.findById("s1")).thenReturn(Optional.of(s));

        assertThat(storyService.getViewers("s1", "bob")).containsExactly("alice");
        assertThatThrownBy(() -> storyService.getViewers("s1", "alice"))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void replyToStory_sendsDmToAuthorAndBroadcasts() {
        Story s = story("s1", "bob");
        when(storyRepository.findById("s1")).thenReturn(Optional.of(s));
        when(conversationRepository.findByParticipantsContaining("alice")).thenReturn(List.of(conv("alice", "bob")));

        DirectConversationResponse conv = new DirectConversationResponse();
        conv.setId("c1");
        conv.setParticipants(List.of("alice", "bob"));
        when(directMessageService.getOrCreateConversation("alice", "bob")).thenReturn(conv);
        MessageResponse msg = org.mockito.Mockito.mock(MessageResponse.class);
        when(directMessageService.sendMessage(eq("c1"), eq("alice"), any())).thenReturn(msg);
        when(userRepository.findByUsername(any())).thenReturn(Optional.of(new User()));

        MessageResponse result = storyService.replyToStory("s1", "alice", "love this!");

        assertThat(result).isSameAs(msg);
        verify(directMessageService).sendMessage(eq("c1"), eq("alice"), any());
        verify(messagingTemplate).convertAndSendToUser(eq("alice"), eq("/queue/messages"), any());
        verify(messagingTemplate).convertAndSendToUser(eq("bob"), eq("/queue/messages"), any());
        verify(webPushService).sendToUser(eq("bob"), any(), eq("love this!"), eq("c1"), any());
    }

    @Test
    void replyToStory_rejectsReplyingToOwnStory() {
        Story s = story("s1", "alice");
        when(storyRepository.findById("s1")).thenReturn(Optional.of(s));

        assertThatThrownBy(() -> storyService.replyToStory("s1", "alice", "hi"))
                .isInstanceOf(ResponseStatusException.class);
        verify(directMessageService, never()).sendMessage(any(), any(), any());
    }

    @Test
    void deleteStory_onlyAuthorAllowed() {
        Story s = story("s1", "bob");
        when(storyRepository.findById("s1")).thenReturn(Optional.of(s));

        assertThatThrownBy(() -> storyService.deleteStory("s1", "alice"))
                .isInstanceOf(ResponseStatusException.class);

        storyService.deleteStory("s1", "bob");
        verify(storyRepository).delete(s);
    }

    private static <T> T argThat(org.mockito.ArgumentMatcher<T> m) {
        return org.mockito.ArgumentMatchers.argThat(m);
    }
}
