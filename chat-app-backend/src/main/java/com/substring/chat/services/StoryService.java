package com.substring.chat.services;

import com.substring.chat.dto.request.CreateStoryRequest;
import com.substring.chat.dto.request.SendDirectMessageRequest;
import com.substring.chat.dto.response.DirectConversationResponse;
import com.substring.chat.dto.response.MessageResponse;
import com.substring.chat.dto.response.StoryGroupResponse;
import com.substring.chat.dto.response.StoryResponse;
import com.substring.chat.entities.DirectConversation;
import com.substring.chat.entities.Story;
import com.substring.chat.repositories.DirectConversationRepository;
import com.substring.chat.repositories.StoryRepository;
import com.substring.chat.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StoryService {

    private static final long STORY_TTL_HOURS = 24;
    private static final int MAX_CONTENT = 700;

    private final StoryRepository storyRepository;
    private final DirectConversationRepository conversationRepository;
    private final DirectMessageService directMessageService;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final WebPushService webPushService;
    private final ExpoPushService expoPushService;

    /** Create a 24-hour story for the author. */
    public StoryResponse createStory(String authorId, CreateStoryRequest request) {
        Story.StoryType type = switch (request.getType() != null ? request.getType().toUpperCase() : "TEXT") {
            case "IMAGE" -> Story.StoryType.IMAGE;
            case "VIDEO" -> Story.StoryType.VIDEO;
            default -> Story.StoryType.TEXT;
        };

        String content = request.getContent() != null ? request.getContent().trim() : "";
        if (content.length() > MAX_CONTENT) content = content.substring(0, MAX_CONTENT);

        boolean isMedia = type == Story.StoryType.IMAGE || type == Story.StoryType.VIDEO;
        if (isMedia) {
            if (request.getMediaUrl() == null || request.getMediaUrl().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A media story needs a mediaUrl");
            }
        } else if (content.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A text story needs content");
        }

        Instant now = Instant.now();
        Story story = new Story();
        story.setAuthorId(authorId);
        story.setType(type);
        story.setContent(content);
        story.setMediaUrl(isMedia ? request.getMediaUrl() : null);
        story.setBackgroundColor(request.getBackgroundColor());
        story.setCreatedAt(now);
        story.setExpiresAt(now.plus(STORY_TTL_HOURS, ChronoUnit.HOURS));
        story.setViewedBy(new ArrayList<>());
        story.setReactions(new java.util.HashMap<>());

        return StoryResponse.from(storyRepository.save(story), authorId);
    }

    /**
     * The stories feed: active stories from the requester plus everyone they share
     * an accepted DM conversation with, grouped by author.
     */
    public List<StoryGroupResponse> getFeed(String username) {
        Set<String> audience = audienceFor(username);
        if (audience.isEmpty()) return List.of();

        List<Story> active = storyRepository
                .findByAuthorIdInAndExpiresAtAfterOrderByCreatedAtAsc(audience, Instant.now());

        Map<String, List<Story>> byAuthor = active.stream()
                .collect(Collectors.groupingBy(Story::getAuthorId));

        List<StoryGroupResponse> groups = new ArrayList<>();
        for (Map.Entry<String, List<Story>> entry : byAuthor.entrySet()) {
            List<Story> stories = entry.getValue();
            List<StoryResponse> responses = stories.stream()
                    .map(s -> StoryResponse.from(s, username))
                    .toList();
            boolean hasUnviewed = responses.stream().anyMatch(r -> !r.isViewedByMe());
            Instant last = stories.stream().map(Story::getCreatedAt)
                    .max(Comparator.naturalOrder()).orElse(Instant.now());
            groups.add(StoryGroupResponse.builder()
                    .authorId(entry.getKey())
                    .stories(responses)
                    .hasUnviewed(hasUnviewed)
                    .lastStoryAt(last)
                    .build());
        }

        // Own group first, then unviewed, then most recent.
        groups.sort(Comparator
                .comparing((StoryGroupResponse g) -> !g.getAuthorId().equals(username))
                .thenComparing(g -> !g.isHasUnviewed())
                .thenComparing(StoryGroupResponse::getLastStoryAt, Comparator.reverseOrder()));
        return groups;
    }

    /** Mark a story viewed by the requester (no-op for the author / already viewed). */
    public void markViewed(String storyId, String username) {
        Story story = activeStoryOrThrow(storyId);
        if (story.getAuthorId().equals(username)) return; // authors don't "view" their own
        if (!audienceFor(username).contains(story.getAuthorId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can't view this story");
        }
        if (story.getViewedBy() == null) story.setViewedBy(new ArrayList<>());
        if (!story.getViewedBy().contains(username)) {
            story.getViewedBy().add(username);
            storyRepository.save(story);
        }
    }

    /** The list of usernames who viewed a story — visible only to its author. */
    public List<String> getViewers(String storyId, String username) {
        Story story = activeStoryOrThrow(storyId);
        if (!story.getAuthorId().equals(username)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the author can see viewers");
        }
        return story.getViewedBy() != null ? story.getViewedBy() : List.of();
    }

    /**
     * Reply to a story — sends a DM to the author quoting the story, delivered in
     * real-time to both participants. Reuses the normal DM rules (blocking, etc.).
     */
    public MessageResponse replyToStory(String storyId, String fromUser, String text) {
        if (text == null || text.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reply cannot be empty");
        }
        Story story = activeStoryOrThrow(storyId);
        String author = story.getAuthorId();
        if (author.equals(fromUser)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You can't reply to your own story");
        }
        if (!audienceFor(fromUser).contains(author)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can't reply to this story");
        }

        DirectConversationResponse conv = directMessageService.getOrCreateConversation(fromUser, author);

        SendDirectMessageRequest req = new SendDirectMessageRequest();
        req.setContent(text.trim());
        // Quote the story so the author knows which one this answers.
        req.setReplyToSnippet(storyPreview(story));
        req.setReplyToSender(resolveName(author));

        MessageResponse response = directMessageService.sendMessage(conv.getId(), fromUser, req);

        // Real-time delivery to both participants.
        for (String participant : conv.getParticipants()) {
            messagingTemplate.convertAndSendToUser(participant, "/queue/messages", response);
        }
        // Background push to the author.
        webPushService.sendToUser(author, resolveName(fromUser), text.trim(), conv.getId(), null);
        expoPushService.sendToUser(author, resolveName(fromUser), text.trim(), conv.getId(), null);

        return response;
    }

    /**
     * Toggle an emoji reaction on a story (one reaction per user, tap-again to remove).
     * On a new (non-removal) reaction, notifies the author the same way a reply does —
     * a DM-style message marked with {@code storyReactionEmoji} so clients can render it
     * as "Reacted 😮 to your story" — plus the existing push channels.
     */
    public StoryResponse reactToStory(String storyId, String username, String emoji) {
        if (emoji == null || emoji.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Emoji is required");
        }
        Story story = activeStoryOrThrow(storyId);
        String author = story.getAuthorId();
        if (author.equals(username)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You can't react to your own story");
        }
        if (!audienceFor(username).contains(author)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can't react to this story");
        }

        Map<String, List<String>> reactions = story.getReactions();
        if (reactions == null) {
            reactions = new java.util.HashMap<>();
            story.setReactions(reactions);
        }
        String existingEmoji = null;
        for (Map.Entry<String, List<String>> entry : reactions.entrySet()) {
            if (entry.getValue().contains(username)) {
                existingEmoji = entry.getKey();
                break;
            }
        }
        if (existingEmoji != null) {
            List<String> existingUsers = reactions.get(existingEmoji);
            existingUsers.remove(username);
            if (existingUsers.isEmpty()) reactions.remove(existingEmoji);
        }
        boolean isNewReaction = !emoji.equals(existingEmoji);
        if (isNewReaction) {
            reactions.computeIfAbsent(emoji, k -> new ArrayList<>()).add(username);
        }
        Story saved = storyRepository.save(story);

        if (isNewReaction) {
            DirectConversationResponse conv = directMessageService.getOrCreateConversation(username, author);
            SendDirectMessageRequest req = new SendDirectMessageRequest();
            req.setContent(emoji);
            req.setStoryReactionEmoji(emoji);
            req.setReplyToSnippet(storyPreview(story));
            req.setReplyToSender(resolveName(author));

            MessageResponse response = directMessageService.sendMessage(conv.getId(), username, req);
            for (String participant : conv.getParticipants()) {
                messagingTemplate.convertAndSendToUser(participant, "/queue/messages", response);
            }
            String name = resolveName(username);
            webPushService.sendToUser(author, name, name + " reacted " + emoji + " to your story", conv.getId(), null);
            expoPushService.sendToUser(author, name, name + " reacted " + emoji + " to your story", conv.getId(), null);
        }

        return StoryResponse.from(saved, username);
    }

    /** Delete an own story. */
    public void deleteStory(String storyId, String username) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Story not found"));
        if (!story.getAuthorId().equals(username)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only delete your own story");
        }
        storyRepository.delete(story);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Story activeStoryOrThrow(String storyId) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Story not found"));
        if (story.getExpiresAt() != null && story.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Story expired");
        }
        return story;
    }

    /** Short preview of a story for use as a DM quote snippet. */
    private String storyPreview(Story story) {
        if (story.getType() == Story.StoryType.IMAGE) return "📷 Photo";
        String c = story.getContent() != null ? story.getContent() : "";
        return c.length() > 80 ? c.substring(0, 80) : c;
    }

    /** Human-friendly name for a username: displayName, then @handle, then the id. */
    private String resolveName(String username) {
        return userRepository.findByUsername(username)
                .map(u -> {
                    if (u.getDisplayName() != null && !u.getDisplayName().isBlank()) return u.getDisplayName();
                    if (u.getUniqueHandle() != null) return u.getUniqueHandle();
                    return username;
                })
                .orElse(username);
    }

    /** Self + everyone the user shares an ACCEPTED DM conversation with. */
    private Set<String> audienceFor(String username) {
        Set<String> audience = new LinkedHashSet<>();
        audience.add(username);
        for (DirectConversation conv : conversationRepository.findByParticipantsContaining(username)) {
            if (conv.getStatus() != null && !"ACCEPTED".equals(conv.getStatus())) continue;
            for (String p : conv.getParticipants()) {
                if (!p.equals(username)) audience.add(p);
            }
        }
        return audience;
    }
}
